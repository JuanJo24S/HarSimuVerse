import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  DatabaseState,
  ServiceHealth,
  ServiceState,
  ServiceStatusSnapshot,
  deriveServiceState,
  parseHealth,
} from '../Core/service-status';

/** Esperas crecientes entre reintentos del socket, en ms. */
const BACKOFF_MS = [2_000, 5_000, 10_000, 20_000, 30_000] as const;

/**
 * Sin latido durante este tiempo, se da el socket por muerto.
 *
 * El servidor emite cada 25s, asi que 60s son dos latidos perdidos: suficiente
 * para no reaccionar a un hipo de red y poco para no quedarse pegado a una
 * conexion zombi.
 */
const WATCHDOG_MS = 60_000;

/**
 * Cada cuanto se llama al servidor para que el plan gratuito no lo suspenda.
 *
 * NO BAJAR ESTE VALOR. El plan gratuito da unas 750 horas de instancia al mes
 * compartidas por toda la cuenta, y el mes tiene ~730 horas: mantenerlo
 * despierto sin descanso se come la cuota entera y deja el servicio CAIDO hasta
 * el mes siguiente, que es mucho peor que un arranque en frio.
 *
 * Cuatro minutos queda por debajo del umbral tipico de inactividad (15 min) con
 * margen de sobra, y solo actua con la pestana visible.
 */
const KEEP_ALIVE_MS = 4 * 60_000;

/** Techo de la peticion de estado: mas alla, el servidor no esta contestando. */
const PING_TIMEOUT_MS = 10_000;

/**
 * Estado del servicio: visible para el usuario y despertando al servidor de paso.
 *
 * El problema que resuelve: el backend vive en un plan gratuito que se suspende
 * tras un rato sin uso y tarda cerca de un minuto en volver. Sin nada que lo
 * indique, un servidor dormido se ve igual que una aplicacion rota — el usuario
 * intenta entrar, la peticion muere por timeout, y parece un error suyo.
 *
 * Arranca una sola vez al cargar la aplicacion.
 */
@Injectable({ providedIn: 'root' })
export class ServiceStatusService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  // ---------- Estado observable ----------

  private readonly lastContactAt = signal<number | null>(null);
  private readonly uptime = signal<number | null>(null);
  private readonly dbState = signal<DatabaseState>('unknown');

  /**
   * Se recalcula con este tick y no con Date.now() dentro del computed, porque
   * un computed sin dependencias reactivas nunca volveria a evaluarse: el paso
   * de `waking` a `offline` ocurre por el paso del tiempo, no por un evento.
   */
  private readonly tick = signal(0);

  private readonly firstAttemptAt = Date.now();

  readonly service = computed<ServiceState>(() => {
    this.tick();
    return deriveServiceState(this.lastContactAt(), this.firstAttemptAt, Date.now());
  });

  readonly database = computed<DatabaseState>(() =>
    // Sin servidor no hay forma de saber como esta la base: suponerlo seria
    // inventar, asi que se declara desconocida.
    this.service() === 'online' ? this.dbState() : 'unknown'
  );

  readonly snapshot = computed<ServiceStatusSnapshot>(() => ({
    service: this.service(),
    database: this.database(),
    uptimeMs: this.uptime(),
    lastContactAt: this.lastContactAt(),
  }));

  /**
   * El servicio esta listo para usarse de verdad.
   *
   * Exige base conectada: mandar a alguien a una pantalla que va a fallar es
   * justo lo que este sistema existe para evitar.
   */
  readonly usable = computed(() => this.service() === 'online' && this.database() !== 'disconnected');

  // ---------- Interno ----------

  private socket: WebSocket | null = null;
  private retryIndex = 0;
  private started = false;

  private reconnectHandle: ReturnType<typeof setTimeout> | null = null;
  private watchdogHandle: ReturnType<typeof setTimeout> | null = null;
  private keepAliveHandle: ReturnType<typeof setInterval> | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * Arranca el cliente. Idempotente: llamarlo dos veces no duplica temporizadores.
   */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    // 1. Ping inmediato: es lo que empieza a despertar el servicio, y cuanto
    //    antes salga, antes estara listo cuando el usuario quiera entrar.
    void this.check();

    // 2. Socket para mantener el estado al dia sin sondear.
    this.openSocket();

    // 3. Reevaluacion periodica: el salto de `waking` a `offline` lo produce el
    //    reloj, no un evento entrante.
    this.tickHandle = setInterval(() => this.tick.update(v => v + 1), 5_000);

    // 4. Keep-alive y reacciones del navegador.
    this.startKeepAlive();
    this.listenToBrowser();
  }

  /** Consulta puntual del estado. Tambien cuenta como actividad para el PaaS. */
  async check(): Promise<void> {
    try {
      const raw = await firstValueFrom(
        this.http
          .get<unknown>(`${environment.apiUrl}/health`)
          .pipe(timeout(PING_TIMEOUT_MS))
      );
      this.apply(parseHealth(raw));
    } catch {
      /*
        No se marca nada como caido aqui. Un fallo puntual no distingue entre
        "dormido" y "roto"; de eso se encarga deriveServiceState() mirando
        cuanto tiempo lleva sin contacto.
      */
    }
  }

  /** Aplica una lectura valida. Una ilegible se descarta sin tocar el estado. */
  private apply(health: ServiceHealth | null): void {
    if (health === null) {
      return;
    }

    this.lastContactAt.set(Date.now());
    this.uptime.set(health.uptimeMs);
    // Ausente = el proyecto no usa base de datos; no se inventa un valor.
    this.dbState.set(health.database ?? 'unknown');
  }

  // ---------- WebSocket ----------

  /**
   * Abre el canal en vivo.
   *
   * Habla el subconjunto minimo del protocolo Pusher que sirve Reverb, con el
   * WebSocket nativo. La alternativa era laravel-echo + pusher-js: unos 35 kB
   * comprimidos de bundle para recibir un objeto cada 25 segundos, en una app
   * que se usa en tablets de colegio.
   */
  private openSocket(): void {
    if (!environment.wsUrl || !environment.reverbKey) {
      return;
    }

    this.clearReconnect();
    this.closeSocket();

    let socket: WebSocket;
    try {
      socket = new WebSocket(
        `${environment.wsUrl}/app/${environment.reverbKey}?protocol=7&client=harsimuverse&version=1.0`
      );
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket = socket;

    socket.onopen = () => {
      this.retryIndex = 0;
      this.armWatchdog();
    };

    socket.onmessage = event => this.onFrame(socket, event);

    socket.onerror = () => {
      // `error` siempre viene seguido de `close`: se deja que sea close quien
      // programe el reintento, para no encadenar dos.
    };

    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        this.clearWatchdog();
        this.scheduleReconnect();
      }
    };
  }

  private onFrame(socket: WebSocket, event: MessageEvent): void {
    // Cualquier trafico prueba que la conexion sigue viva, sea del tipo que sea.
    this.armWatchdog();

    let frame: { event?: string; data?: unknown };
    try {
      frame = JSON.parse(event.data as string);
    } catch {
      // Trama ilegible: se descarta y se conserva el ultimo estado bueno, que
      // es mejor informacion que un estado en blanco.
      return;
    }

    switch (frame.event) {
      case 'pusher:connection_established':
        socket.send(
          JSON.stringify({ event: 'pusher:subscribe', data: { channel: 'service-status' } })
        );
        return;

      case 'pusher:ping':
        // Sin pong el servidor cierra la conexion por inactividad.
        socket.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
        return;

      case 'status':
        this.apply(parseHealth(this.decode(frame.data)));
        return;

      default:
        // pusher_internal:subscription_succeeded y demas: nada que hacer.
        return;
    }
  }

  /** El payload de Pusher viaja como cadena JSON dentro de la trama. */
  private decode(data: unknown): unknown {
    if (typeof data !== 'string') {
      return data;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private closeSocket(): void {
    if (!this.socket) {
      return;
    }
    const socket = this.socket;
    this.socket = null;
    // Se desconectan los handlers antes de cerrar para que este cierre
    // deliberado no dispare el reintento de onclose.
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    try {
      socket.close();
    } catch {
      // Ya estaba cerrandose.
    }
    this.clearWatchdog();
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    const delay = BACKOFF_MS[Math.min(this.retryIndex, BACKOFF_MS.length - 1)];
    this.retryIndex++;
    this.reconnectHandle = setTimeout(() => this.openSocket(), delay);
  }

  private clearReconnect(): void {
    if (this.reconnectHandle !== null) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }
  }

  /**
   * Watchdog.
   *
   * Detras de un proxy una conexion puede quedarse "abierta" pero muerta: no
   * llega nada y el navegador nunca dispara `close`. Sin esto el cliente se
   * quedaria mostrando el ultimo estado para siempre. Si pasan 60s sin trafico,
   * se cierra a mano y se reconecta.
   */
  private armWatchdog(): void {
    this.clearWatchdog();
    this.watchdogHandle = setTimeout(() => {
      this.closeSocket();
      this.retryIndex = 0;
      this.openSocket();
    }, WATCHDOG_MS);
  }

  private clearWatchdog(): void {
    if (this.watchdogHandle !== null) {
      clearTimeout(this.watchdogHandle);
      this.watchdogHandle = null;
    }
  }

  // ---------- Keep-alive y navegador ----------

  /**
   * Mantiene el servicio despierto MIENTRAS ALGUIEN LO ESTA MIRANDO.
   *
   * Dos cosas que no son evidentes:
   *
   * 1. El latido del socket no sirve para esto: va del servidor al cliente, y
   *    lo que cuenta como actividad para el detector de inactividad son las
   *    peticiones ENTRANTES. Por eso hace falta llamar de verdad.
   *
   * 2. La comprobacion de visibilidad no es un detalle de cortesia: es lo que
   *    protege la cuota. Una pestana olvidada en segundo plano no debe gastar
   *    horas de instancia manteniendo vivo algo que nadie usa.
   */
  private startKeepAlive(): void {
    this.keepAliveHandle = setInterval(() => {
      if (this.document.visibilityState === 'visible') {
        void this.check();
      }
    }, KEEP_ALIVE_MS);
  }

  private listenToBrowser(): void {
    /*
      Al volver a la pestana se comprueba en el acto: en segundo plano el
      navegador ralentiza los temporizadores, asi que el estado que se ve al
      volver puede llevar minutos sin refrescarse.

      Y al ocultarla se CIERRA el socket. Es una precaucion sobre la cuota: no
      esta confirmado si una conexion WebSocket abierta cuenta como actividad
      para el detector de inactividad del proveedor. Si contara, una pestana
      oculta con el socket vivo mantendria el servicio despierto y la proteccion
      de visibilidad quedaria a medias. Cerrarlo es correcto bajo las dos
      hipotesis y no cuesta nada: al volver se reabre.
    */
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') {
        void this.check();
        if (!this.socket) {
          this.retryIndex = 0;
          this.openSocket();
        }
      } else {
        this.clearReconnect();
        this.closeSocket();
      }
    });

    // Tras suspender el equipo o cambiar de red, el socket suele estar muerto
    // sin que el navegador se haya enterado.
    window.addEventListener('online', () => {
      void this.check();
      this.retryIndex = 0;
      this.openSocket();
    });
  }
}
