import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { AudioService } from '../../../Services/audio.service';
import { INITIAL_LIVES, GameStatusService } from '../../../Services/game-status.service';

/**
 * Barra superior de los minijuegos: sonido, reloj, nickname, puntaje y vidas.
 *
 * El mismo bloque de HTML estaba copiado en los seis juegos, con pequenas
 * divergencias que eran bugs por si mismas (uno mostraba el score sin sumar el
 * del nivel, otro tenia el `text-black` de Tailwind pegado a mano). Aqui vive
 * una sola vez.
 */
@Component({
  selector: 'app-game-header',
  imports: [TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="on-dark sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3
             rounded-b-2xl bg-panel-solid/90 px-4 py-3 text-slate-50
             shadow-[0_6px_18px_rgb(2_6_23/0.35)]">

      <div class="flex flex-1 items-center gap-3">
        <button
          type="button"
          class="hsv-icon-btn"
          (click)="toggleMute()"
          [attr.aria-label]="muted() ? 'Activar sonido' : 'Silenciar sonido'">
          {{ muted() ? '🔇' : '🔊' }}
        </button>

        <!--
          El tiempo bajo no se senala solo con color: tambien engorda, se
          enmarca y late. Un nino con daltonismo rojo-verde lo distingue igual.
          aria-live off para que el lector de pantalla no lea cada segundo.
        -->
        <p
          class="flex items-center gap-1.5 rounded-full font-display tabular-nums
                 transition-all duration-200"
          [class]="isTimeLow()
            ? 'border-2 border-red-300 bg-lose/25 px-3 py-1 text-3xl text-red-200 animate-time-low'
            : 'text-xl sm:text-2xl'"
          aria-live="off">
          <span aria-hidden="true">⏳</span><span>{{ timeLeft() }}</span><span class="text-base">s</span>
        </p>
      </div>

      <!-- En movil pasa a su propia fila en vez de apretar el reloj. -->
      <div class="order-first basis-full text-center sm:order-none sm:basis-auto">
        <p class="font-display text-xl leading-tight sm:text-2xl">{{ nickname() | titlecase }}</p>
        @if (levelLabel()) {
          <p class="text-xs font-semibold text-slate-300">{{ levelLabel() }}</p>
        }
      </div>

      <div class="flex flex-1 items-center justify-end gap-3.5">
        <p class="flex items-center gap-1.5 font-display text-xl tabular-nums sm:text-2xl">
          <span aria-hidden="true">⭐</span>{{ totalScore() }}
        </p>
        <p class="flex gap-1 text-xl whitespace-nowrap" [attr.aria-label]="lives() + ' vidas restantes'">
          @for (life of livesArray(); track $index) {
            <span aria-hidden="true">❤️</span>
          }
          <!-- Los corazones perdidos se dibujan vacios en vez de desaparecer:
               asi se ve cuanto margen queda, no solo lo que se tiene. -->
          @for (lost of lostArray(); track $index) {
            <span class="opacity-35 grayscale" aria-hidden="true">🤍</span>
          }
        </p>
      </div>
    </header>
  `,
  styleUrl: './game-header.component.css',
})
export class GameHeaderComponent {
  /** Segundos restantes de la ronda. */
  readonly timeLeft = input.required<number>();

  /** Puntos ganados en el nivel actual, aun no sumados al acumulado. */
  readonly localScore = input<number>(0);

  /** Texto opcional del nivel, por ejemplo "Nivel 2 de 5". */
  readonly levelLabel = input<string>('');

  /** Umbral en segundos para pintar el reloj en rojo. */
  readonly lowTimeThreshold = input<number>(15);

  private readonly gameStatus = inject(GameStatusService);
  private readonly audio = inject(AudioService);

  readonly nickname = this.gameStatus.nickname;
  readonly lives = this.gameStatus.lives;
  readonly livesArray = this.gameStatus.livesArray;
  readonly muted = this.audio.muted;

  readonly totalScore = computed(() => this.gameStatus.score() + this.localScore());
  readonly isTimeLow = computed(() => this.timeLeft() <= this.lowTimeThreshold());

  /** Corazones perdidos, para dibujarlos vacios junto a los que quedan. */
  readonly lostArray = computed(() =>
    Array.from({ length: Math.max(0, INITIAL_LIVES - this.lives()) })
  );

  toggleMute(): void {
    this.audio.toggleMute();
  }
}
