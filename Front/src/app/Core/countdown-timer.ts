import { signal } from '@angular/core';

/**
 * Cuenta atras de los minijuegos.
 *
 * Existe para resolver tres bugs que se repetian en cada juego:
 *
 *  1. Intervalos duplicados. En game1 el boton "Revolver Cartas" llamaba a
 *     iniciarTemporizador() sin limpiar el anterior, asi que el reloj bajaba
 *     de dos en dos (y de tres en tres al tercer click). start() siempre
 *     limpia el handle previo.
 *
 *  2. El reloj seguia corriendo con un modal de SweetAlert abierto, asi que el
 *     jugador perdia tiempo leyendo "perdiste una vida". pause()/resume()
 *     permiten congelarlo (ver Core/game-dialog.ts).
 *
 *  3. Fugas al destruir el componente. stop() es idempotente y los
 *     componentes lo llaman en ngOnDestroy.
 */
export class CountdownTimer {
  /** Segundos restantes. Signal para que la plantilla se actualice sola. */
  readonly remaining = signal(0);

  private handle: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  private expired = false;

  /**
   * @param durationSeconds Duracion por defecto de cada ronda.
   * @param onExpire        Se ejecuta una sola vez al llegar a 0.
   */
  constructor(
    private readonly durationSeconds: number,
    private readonly onExpire: () => void
  ) {
    this.remaining.set(durationSeconds);
  }

  get isRunning(): boolean {
    return this.handle !== null && !this.paused;
  }

  /** Arranca (o reinicia) la cuenta atras. */
  start(seconds: number = this.durationSeconds): void {
    this.stop();
    this.expired = false;
    this.paused = false;
    this.remaining.set(seconds);

    this.handle = setInterval(() => {
      if (this.paused) {
        return;
      }

      const next = this.remaining() - 1;
      this.remaining.set(Math.max(0, next));

      if (next <= 0 && !this.expired) {
        this.expired = true;
        this.stop();
        this.onExpire();
      }
    }, 1000);
  }

  /** Congela el reloj sin perder los segundos restantes. */
  pause(): void {
    this.paused = true;
  }

  /** Reanuda tras un pause(). No hace nada si el reloj ya expiro o no arranco. */
  resume(): void {
    if (this.handle !== null && !this.expired) {
      this.paused = false;
    }
  }

  /** Detiene y libera el intervalo. Seguro de llamar varias veces. */
  stop(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
    this.paused = false;
  }
}
