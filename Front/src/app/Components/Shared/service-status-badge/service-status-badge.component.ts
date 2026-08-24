import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { describeUptime, formatUptime } from '../../../Core/format-uptime';
import { ServiceStatusService } from '../../../Services/service-status.service';

/**
 * Distintivo de estado del servicio.
 *
 * Dos variantes en un solo componente en vez de repetir el mismo bloque en cada
 * pantalla:
 *
 *   `nav`  — compacto, para una barra superior: punto, icono y etiqueta corta.
 *   `page` — bloque explicado, para pantallas publicas donde el usuario esta
 *            esperando a poder entrar y necesita saber por que.
 */
@Component({
  selector: 'app-service-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'nav') {
      <span
        class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold"
        [class]="tone().chip"
        role="status"
        [attr.aria-label]="ariaLabel()">
        <!-- Nunca solo color: el punto va acompanado de icono y etiqueta. -->
        <span class="size-2.5 rounded-full" [class]="tone().dot" aria-hidden="true"></span>
        <span aria-hidden="true">{{ tone().icon }}</span>
        <span>{{ tone().label }}</span>
      </span>
    } @else {
      <section
        class="flex flex-col gap-3 rounded-2xl border-2 p-5"
        [class]="tone().panel"
        role="status"
        [attr.aria-label]="ariaLabel()">

        <div class="flex items-center gap-3">
          <span class="size-3 shrink-0 rounded-full" [class]="tone().dot" aria-hidden="true"></span>
          <span class="text-2xl" aria-hidden="true">{{ tone().icon }}</span>
          <span class="font-display text-xl" [class]="tone().title">{{ tone().label }}</span>
        </div>

        <p class="m-0 text-base font-semibold" [class]="tone().body">{{ tone().detail }}</p>

        <!--
          El tiempo encendido solo se muestra si aporta. Con el servicio caido no
          hay dato, y ensenar "desconocido" es ruido.
        -->
        @if (uptimeLine(); as line) {
          <p class="m-0 text-sm font-semibold opacity-80" [class]="tone().body">{{ line }}</p>
        }
      </section>
    }
  `,
})
export class ServiceStatusBadgeComponent {
  readonly variant = input<'nav' | 'page'>('nav');

  private readonly status = inject(ServiceStatusService);

  readonly service = this.status.service;
  readonly database = this.status.database;

  /**
   * Tiempo encendido, ya traducido a lo que significa.
   *
   * Se prefiere la lectura ("ya estaba en marcha") al numero suelto: el dato
   * solo existe para responder si la visita desperto el servicio o no.
   */
  readonly uptimeLine = computed<string | null>(() => {
    if (this.service() !== 'online') {
      return null;
    }

    const ms = this.status.snapshot().uptimeMs;
    const meaning = describeUptime(ms);

    return meaning === null
      ? null
      : `Encendido: ${formatUptime(ms)} — ${meaning}`;
  });

  readonly ariaLabel = computed(() => `${this.tone().label}. ${this.tone().detail}`);

  /**
   * Color, icono, etiqueta y explicacion de cada estado.
   *
   * El caso que mas importa es "servidor en pie pero base caida": NO se pinta en
   * verde ni se invita a entrar. Mandar a alguien a un login que va a fallar es
   * justo lo que este sistema existe para evitar.
   */
  readonly tone = computed(() => {
    if (this.service() === 'online' && this.database() === 'disconnected') {
      return {
        icon: '⚠️',
        label: 'Servicio degradado',
        detail:
          'El servidor responde, pero la base de datos no está disponible. Los puntajes no se pueden guardar ni consultar todavía.',
        chip: 'bg-amber-100 text-amber-900',
        panel: 'border-alert bg-alert/10',
        dot: 'bg-alert',
        title: 'text-amber-900',
        body: 'text-amber-900',
      };
    }

    switch (this.service()) {
      case 'online':
        return {
          icon: '✅',
          label: 'En línea',
          detail: 'El servicio está funcionando con normalidad.',
          chip: 'bg-emerald-100 text-emerald-900',
          panel: 'border-win bg-win/10',
          dot: 'bg-win',
          title: 'text-emerald-900',
          body: 'text-emerald-900',
        };

      case 'waking':
        return {
          icon: '⏳',
          label: 'Despertando',
          detail:
            'El servidor estaba en reposo y está arrancando. Suele tardar cerca de un minuto; tu propia visita lo está despertando.',
          chip: 'bg-sky-100 text-sky-900',
          panel: 'border-sky-500 bg-sky-500/10',
          dot: 'bg-sky-500 animate-pulse-dot',
          title: 'text-sky-900',
          body: 'text-sky-900',
        };

      case 'offline':
        return {
          icon: '🔌',
          label: 'Sin conexión',
          detail:
            'No se consigue contactar con el servicio. Puede ser tu conexión o una caída del servidor.',
          chip: 'bg-red-100 text-red-900',
          panel: 'border-lose bg-lose/10',
          dot: 'bg-lose',
          title: 'text-red-900',
          body: 'text-red-900',
        };

      default:
        // `checking`: todavia no se ha recibido nada, asi que no se afirma nada.
        return {
          icon: '🔄',
          label: 'Comprobando',
          detail: 'Consultando el estado del servicio…',
          chip: 'bg-slate-200 text-slate-700',
          panel: 'border-slate-300 bg-slate-100',
          dot: 'bg-slate-400 animate-pulse-dot',
          title: 'text-slate-700',
          body: 'text-slate-600',
        };
    }
  });
}
