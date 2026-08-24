import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { GameHeaderComponent } from '../../../Shared/game-header/game-header.component';
import { CountdownTimer } from '../../../../Core/countdown-timer';
import {
  DragDropSelection,
  allowDrop,
  readDraggedId,
  writeDraggedId,
} from '../../../../Core/drag-drop-selection';
import { closeGameDialogs, gameDialog } from '../../../../Core/game-dialog';
import { shuffle } from '../../../../Core/shuffle';
import { AudioService } from '../../../../Services/audio.service';
import { GameStatusService } from '../../../../Services/game-status.service';

interface Pieza {
  /** Identificador compartido entre la pieza y su hueco. */
  name: string;
  label: string;
  src: string;
  placed: boolean;
}

const ROUND_SECONDS = 120;
const POINTS_PER_PIECE = 15;

/**
 * Las ocho piezas internas del computador.
 *
 * Los rotulos estaban cruzados en la version anterior: la pieza `procesador`
 * tenia alt "GPU", su hueco decia "CPU", y el hueco de la pieza `cpu` (que es
 * el gabinete) decia "Gabinete" mientras la pieza no tenia rotulo. Un nino que
 * lea "CPU" y busque el procesador acertaba por casualidad.
 */
const PIEZAS: ReadonlyArray<Omit<Pieza, 'placed'>> = [
  { name: 'fuente', label: 'Fuente de poder', src: '/assets/img/Juego 4/fuente_poder-Juego4.png' },
  { name: 'ram', label: 'Memoria RAM', src: '/assets/img/Juego 4/ram-Juego4.png' },
  { name: 'procesador', label: 'Procesador', src: '/assets/img/Juego 4/procesador-Juego4.png' },
  { name: 'cpu', label: 'Gabinete', src: '/assets/img/Juego 4/CPU-Juego4.png' },
  { name: 'tarjetar', label: 'Tarjeta de red', src: '/assets/img/Juego 4/tarjeta-red-Juego4.png' },
  { name: 'disipador', label: 'Disipador', src: '/assets/img/Juego 4/disipador-Juego4.png' },
  { name: 'disco', label: 'Disco duro', src: '/assets/img/Juego 4/discoDuro-Juego4.png' },
  { name: 'lector', label: 'Lector de CD', src: '/assets/img/Juego 4/lector_cd-Juego4.png' },
];

@Component({
  selector: 'app-game2',
  imports: [GameHeaderComponent],
  templateUrl: './game2.component.html',
  styleUrl: './game2.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Game2Component implements OnInit, OnDestroy {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly timer = new CountdownTimer(ROUND_SECONDS, () => void this.handleTimeOver());
  readonly selection = new DragDropSelection();

  readonly piezas = signal<Pieza[]>([]);
  readonly localScore = signal(0);
  readonly hoveredZone = signal<string | null>(null);
  readonly rejectedZone = signal<string | null>(null);

  /** Orden de los huecos: distinto al de las piezas para que no sea trivial. */
  readonly huecos = signal<Pieza[]>([]);

  readonly pendientes = computed(() => this.piezas().filter(pieza => !pieza.placed));
  readonly colocadas = computed(() => this.piezas().filter(pieza => pieza.placed).length);

  private resolving = false;
  private rejectHandle: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.audio.playTrack('/assets/Audios/Nivel 2-1.mp3', { destroyRef: this.destroyRef });
    this.nuevaPartida();
  }

  ngOnDestroy(): void {
    this.timer.stop();
    this.clearReject();
    closeGameDialogs();
  }

  // ---------- Consultas de plantilla ----------

  piezaEnHueco(name: string): Pieza | undefined {
    return this.piezas().find(pieza => pieza.name === name && pieza.placed);
  }

  huecoLleno(name: string): boolean {
    return this.piezaEnHueco(name) !== undefined;
  }

  huecoCandidato(name: string): boolean {
    return this.selection.selected() !== null && !this.huecoLleno(name);
  }

  // ---------- Ciclo del juego ----------

  /** Partida nueva: reinicia vidas, tablero y puntaje del nivel. */
  private nuevaPartida(): void {
    this.gameStatus.resetLives();
    this.localScore.set(0);
    this.nuevaRonda();
  }

  /**
   * Tablero limpio conservando vidas Y el puntaje del nivel.
   *
   * OJO: aqui estaba el exploit de puntuacion. Al fallar una pieza el juego
   * llamaba a resetearRonda(), que vaciaba el tablero pero NO reiniciaba
   * localScore. Se podian colocar siete piezas (105 puntos), fallar la octava
   * a proposito, y volver a colocar las mismas siete: 210 puntos. Repetible sin
   * limite mientras quedaran vidas. Ahora un fallo no borra el tablero; solo
   * cuesta una vida.
   */
  private nuevaRonda(): void {
    this.clearReject();
    this.resolving = false;
    this.selection.clear();
    this.hoveredZone.set(null);
    this.rejectedZone.set(null);

    const piezas = PIEZAS.map(pieza => ({ ...pieza, placed: false }));
    this.piezas.set(piezas);
    this.huecos.set(shuffle(piezas));
    this.timer.start(ROUND_SECONDS);
  }

  // ---------- Arrastrar / tocar ----------

  onDragStart(event: DragEvent, name: string): void {
    writeDraggedId(event, name);
    this.selection.arm(name);
  }

  /**
   * Fin del arrastre (se dispara tanto si se solto sobre un hueco como si se
   * cancelo soltando en el vacio).
   *
   * Limpiar la seleccion aqui arregla un bug de la ruta tactil/raton mezcladas:
   * si el jugador empezaba a arrastrar y soltaba fuera, la pieza quedaba
   * "armada" en silencio, y el siguiente click en CUALQUIER hueco la colocaba
   * ahi sin que el jugador lo pidiera, normalmente costandole una vida.
   * El drop ya leyo la seleccion antes de que llegue este evento, asi que
   * limpiarla no afecta a una colocacion correcta.
   */
  onDragEnd(): void {
    this.hoveredZone.set(null);
    this.selection.clear();
  }

  onDragOver(event: DragEvent, name: string): void {
    allowDrop(event);
    this.hoveredZone.set(name);
  }

  onDragLeave(name: string): void {
    if (this.hoveredZone() === name) {
      this.hoveredZone.set(null);
    }
  }

  onDrop(event: DragEvent, name: string): void {
    event.preventDefault();
    this.hoveredZone.set(null);
    void this.colocar(this.selection.resolveSource(readDraggedId(event)), name);
  }

  onPiezaTap(name: string): void {
    this.selection.select(name);
  }

  onHuecoTap(name: string): void {
    if (this.selection.selected() === null) {
      return;
    }
    void this.colocar(this.selection.resolveSource(null), name);
  }

  private async colocar(source: string | null, target: string): Promise<void> {
    if (source === null || this.resolving || this.huecoLleno(target)) {
      return;
    }

    this.selection.clear();

    if (source !== target) {
      await this.handlePiezaIncorrecta(target);
      return;
    }

    this.piezas.update(piezas =>
      piezas.map(pieza => (pieza.name === target ? { ...pieza, placed: true } : pieza))
    );
    this.localScore.update(value => value + POINTS_PER_PIECE);

    if (this.colocadas() === this.piezas().length) {
      await this.completarNivel();
    }
  }

  private async completarNivel(): Promise<void> {
    this.timer.stop();

    const timeBonus = this.timer.remaining();
    const total = this.localScore() + timeBonus;

    /*
      addScore() suma `total` al puntaje global, y la cabecera muestra
      gameStatus.score() + localScore(). Dejar localScore en `total` hacia que
      los puntos del nivel se vieran DOS veces en el marcador durante todo el
      rato que el modal de fin de nivel estaba abierto. Se pone a cero: el
      acumulado ya los tiene.
    */
    this.gameStatus.addScore(total);
    this.localScore.set(0);

    await gameDialog({
      icon: 'success',
      title: '🎉 ¡Nivel completado!',
      html: `Armaste el computador por dentro y sumaste <b>${total}</b> puntos.`,
      confirmButtonText: 'Siguiente nivel',
      confirmButtonColor: '#16a34a',
    });

    void this.router.navigate(['/junior/level-2']);
  }

  private async handlePiezaIncorrecta(target: string): Promise<void> {
    this.resolving = true;

    this.rejectedZone.set(target);
    this.clearReject();
    this.rejectHandle = setTimeout(() => this.rejectedZone.set(null), 800);

    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    await gameDialog(
      {
        icon: 'warning',
        title: '⚠️ Pieza incorrecta',
        text: `Esa no va ahí. Te quedan ${this.gameStatus.lives()} vidas. Las piezas que ya colocaste se quedan.`,
        confirmButtonColor: '#f59e0b',
      },
      this.timer
    );

    this.resolving = false;
  }

  private async handleTimeOver(): Promise<void> {
    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    await gameDialog({
      icon: 'warning',
      title: '⏳ ¡Tiempo agotado!',
      text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()}.`,
    });

    // El tiempo agotado si reinicia el tablero, pero el puntaje del nivel
    // vuelve a cero para que no se acumule por rondas.
    this.localScore.set(0);
    this.nuevaRonda();
  }

  private async handleGameOver(): Promise<void> {
    this.timer.stop();

    const result = await gameDialog({
      icon: 'error',
      title: '💀 Sin vidas',
      text: '¿Quieres intentar este nivel otra vez?',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      this.nuevaPartida();
    } else {
      this.gameStatus.resetAll();
      void this.router.navigate(['/home']);
    }
  }

  private clearReject(): void {
    if (this.rejectHandle !== null) {
      clearTimeout(this.rejectHandle);
      this.rejectHandle = null;
    }
  }
}
