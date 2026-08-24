/**
 * Modelo del estado del servicio, compartido por el cliente y la vista.
 */

/**
 * Estado del SERVICIO. Cuatro valores, no dos.
 *
 * La distincion entre `waking` y `offline` es la que evita mentir: el plan
 * gratuito suspende el servicio tras un rato sin uso y tarda cerca de un minuto
 * en volver, asi que durante el primer minuto y medio sin respuesta lo mas
 * probable es que este despertando, no caido. Decir "caido" ahi manda al
 * usuario a cerrar la pestana justo cuando su propia visita esta levantando el
 * servicio.
 */
export type ServiceState = 'checking' | 'online' | 'waking' | 'offline';

/**
 * Estado de la BASE DE DATOS. Va aparte del servicio a proposito.
 *
 * Que el proceso conteste no significa que la aplicacion sirva: sin base de
 * datos el ranking falla entero. `unknown` es el cuarto valor necesario: sin
 * servidor no hay forma de consultarla, y suponerlo seria inventar.
 */
export type DatabaseState = 'connected' | 'disconnected' | 'unknown';

/** El objeto que publican /api/health y el canal en vivo. */
export interface ServiceHealth {
  status: 'online';
  /** Ausente si el proyecto no usa base de datos. */
  database?: 'connected' | 'disconnected';
  /** Milisegundos que lleva encendido el proceso. */
  uptimeMs: number;
  timestamp: string;
}

/** Lo que consume la vista. */
export interface ServiceStatusSnapshot {
  service: ServiceState;
  database: DatabaseState;
  /** null mientras no haya habido ninguna respuesta. */
  uptimeMs: number | null;
  /** Momento de la ultima respuesta recibida, o null. */
  lastContactAt: number | null;
}

/**
 * Cuanto se concede a un arranque en frio antes de dar el servicio por caido.
 *
 * El proveedor tarda cerca de un minuto; 90 segundos deja margen para una red
 * lenta sin alargar tanto la incertidumbre como para que el usuario se quede
 * mirando una pantalla que no avanza.
 */
export const WAKING_GRACE_MS = 90_000;

/**
 * Deduce el estado del servicio.
 *
 * Es una funcion pura y sin reloj propio —el instante entra por parametro— para
 * poder probar los limites sin esperar minuto y medio.
 *
 * @param lastContactAt  Ultima respuesta recibida, o null si aun no hubo ninguna.
 * @param firstAttemptAt Cuando empezo a intentarlo.
 * @param now            Instante actual.
 */
export function deriveServiceState(
  lastContactAt: number | null,
  firstAttemptAt: number,
  now: number
): ServiceState {
  if (lastContactAt !== null) {
    return 'online';
  }

  /*
    Sin ninguna respuesta todavia. Se mide desde el primer intento, no desde el
    arranque de la pagina: si la red tardo en levantarse, el reloj de gracia
    tiene que empezar cuando de verdad se empezo a preguntar.
  */
  return now - firstAttemptAt < WAKING_GRACE_MS ? 'waking' : 'offline';
}

/**
 * Valida el objeto que llega por HTTP o por el socket.
 *
 * Devuelve null si no es utilizable. Un mensaje ilegible no debe romper el
 * estado: el cliente lo descarta y se queda con el ultimo bueno, que es mejor
 * informacion que un estado en blanco.
 */
export function parseHealth(raw: unknown): ServiceHealth | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;

  if (data['status'] !== 'online') {
    return null;
  }

  // uptimeMs tiene que ser un numero finito y no negativo para poder mostrarlo.
  const uptime = data['uptimeMs'];
  if (typeof uptime !== 'number' || !Number.isFinite(uptime) || uptime < 0) {
    return null;
  }

  const database = data['database'];
  const validDatabase = database === 'connected' || database === 'disconnected';

  return {
    status: 'online',
    // Se omite si no vino: el proyecto puede no usar base de datos.
    ...(validDatabase ? { database } : {}),
    uptimeMs: uptime,
    timestamp: typeof data['timestamp'] === 'string' ? data['timestamp'] : new Date().toISOString(),
  };
}
