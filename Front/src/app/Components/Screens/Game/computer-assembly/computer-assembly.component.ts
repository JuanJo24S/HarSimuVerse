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
import { AudioService } from '../../../../Services/audio.service';
import { GameStatusService } from '../../../../Services/game-status.service';

type PartType = 'monitor' | 'keyboard' | 'mouse' | 'tower';

interface GamePart {
  type: PartType;
  label: string;
  img: string;
  placed: boolean;
}

const ROUND_SECONDS = 120;
const POINTS_PER_PART = 15;

@Component({
  selector: 'app-computer-assembly',
  imports: [GameHeaderComponent],
  templateUrl: './computer-assembly.component.html',
  styleUrl: './computer-assembly.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComputerAssemblyComponent implements OnInit, OnDestroy {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly timer = new CountdownTimer(ROUND_SECONDS, () => void this.handleTimeOver());
  readonly selection = new DragDropSelection();

  readonly localScore = signal(0);
  readonly gameCompleted = signal(false);

  /** Zona que esta recibiendo un arrastre, para el resaltado. */
  readonly hoveredZone = signal<PartType | null>(null);

  /** Zona que acaba de rechazar una pieza, para la animacion de error. */
  readonly rejectedZone = signal<PartType | null>(null);

  readonly parts = signal<GamePart[]>([]);

  readonly pendingParts = computed(() => this.parts().filter(part => !part.placed));
  readonly placedCount = computed(() => this.parts().filter(part => part.placed).length);

  private resolving = false;
  private rejectHandle: ReturnType<typeof setTimeout> | null = null;

  private readonly basePart: ReadonlyArray<GamePart> = [
    { type: 'monitor', label: 'Monitor', img: '/assets/img/Juego 3/Pantalla-juego3.png', placed: false },
    { type: 'keyboard', label: 'Teclado', img: '/assets/img/Juego 3/Teclado-Juego3.png', placed: false },
    { type: 'mouse', label: 'Ratón', img: '/assets/img/Juego 3/Mouse-Juego3.png', placed: false },
    { type: 'tower', label: 'Torre', img: '/assets/img/Juego 3/Torre-Juego3.png', placed: false },
  ];

  /**
   * Orden en que se pintan los huecos del escritorio.
   *
   * Se deriva de basePart en vez de repetir la lista: antes los tipos y los
   * rotulos estaban escritos dos veces, asi que anadir o renombrar una pieza
   * obligaba a tocar los dos sitios y era facil que se desincronizaran (un
   * rotulo cambiado solo aqui deja el hueco mintiendo sobre lo que espera).
   */
  readonly zones: ReadonlyArray<{ type: PartType; label: string }> = this.basePart.map(
    ({ type, label }) => ({ type, label })
  );

  ngOnInit(): void {
    this.audio.playTrack('/assets/Audios/Juego1-3.mp3', { destroyRef: this.destroyRef });
    this.newRound();
  }

  ngOnDestroy(): void {
    this.timer.stop();
    this.clearReject();
    closeGameDialogs();
  }

  // ---------- Consultas de plantilla ----------

  partFor(zone: PartType): GamePart | undefined {
    return this.parts().find(part => part.type === zone && part.placed);
  }

  isZoneFilled(zone: PartType): boolean {
    return this.partFor(zone) !== undefined;
  }

  /** Un hueco es candidato si hay una pieza tocada y todavia esta libre. */
  isZoneCandidate(zone: PartType): boolean {
    return this.selection.selected() !== null && !this.isZoneFilled(zone);
  }

  // ---------- Ciclo del juego ----------

  private newRound(): void {
    this.timer.stop();
    this.clearReject();
    this.resolving = false;
    this.selection.clear();
    this.hoveredZone.set(null);
    this.rejectedZone.set(null);
    this.gameCompleted.set(false);
    this.localScore.set(0);
    this.parts.set(this.basePart.map(part => ({ ...part, placed: false })));
    this.timer.start(ROUND_SECONDS);
  }

  // ---------- Arrastrar (escritorio) ----------

  onDragStart(event: DragEvent, type: PartType): void {
    writeDraggedId(event, type);
    this.selection.arm(type);
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

  onDragOver(event: DragEvent, zone: PartType): void {
    allowDrop(event);
    /*
      Antes el resaltado se hacia con (event.target as HTMLElement).classList.
      `target` es el elemento concreto bajo el cursor, que dentro del hueco
      suele ser el <img> o el <span> del rotulo, no el hueco: la clase
      .drag-over se pegaba al hijo y el borde nunca se veia. Y como
      dragleave se disparaba en un elemento distinto al de dragover, la clase
      quedaba pegada para siempre. Ahora el estado vive en un signal, sin
      manipular el DOM a mano.
    */
    this.hoveredZone.set(zone);
  }

  onDragLeave(zone: PartType): void {
    if (this.hoveredZone() === zone) {
      this.hoveredZone.set(null);
    }
  }

  onDrop(event: DragEvent, zone: PartType): void {
    event.preventDefault();
    this.hoveredZone.set(null);
    void this.place(this.selection.resolveSource(readDraggedId(event)), zone);
  }

  // ---------- Tocar (tablet) ----------

  onPartTap(type: PartType): void {
    this.selection.select(type);
  }

  onZoneTap(zone: PartType): void {
    if (this.selection.selected() === null) {
      return;
    }
    void this.place(this.selection.resolveSource(null), zone);
  }

  // ---------- Colocacion ----------

  private async place(source: string | null, zone: PartType): Promise<void> {
    if (source === null || this.resolving || this.gameCompleted() || this.isZoneFilled(zone)) {
      return;
    }

    this.selection.clear();

    if (source !== zone) {
      await this.handleWrongPlacement(zone);
      return;
    }

    this.parts.update(parts =>
      parts.map(part => (part.type === zone ? { ...part, placed: true } : part))
    );
    this.localScore.update(value => value + POINTS_PER_PART);

    if (this.placedCount() === this.parts().length) {
      await this.handleCompleted();
    }
  }

  private async handleCompleted(): Promise<void> {
    this.timer.stop();
    this.gameCompleted.set(true);

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
      title: '🎉 ¡Excelente!',
      html: `Armaste el computador de Juancho y sumaste <b>${total}</b> puntos.`,
      confirmButtonText: 'Ver resultados',
      confirmButtonColor: '#16a34a',
    });

    /*
      Aqui estaba el POST del puntaje (this.setScore(payload)) justo antes de
      navegar. Se movio a la pantalla de resultados por tres razones:
        - se disparaba y se navegaba en el mismo tick, sin esperar respuesta ni
          avisar al jugador si fallaba;
        - usaba this.score, que en ese punto ya incluia el puntaje del nivel,
          pero el orden respecto a addScore() era fragil;
        - volver con el boton "atras" y avanzar de nuevo repetia el envio.
      Ahora ScoreComponent lo envia una sola vez, con reintento y feedback.
    */
    void this.router.navigate(['/score']);
  }

  private async handleWrongPlacement(zone: PartType): Promise<void> {
    this.resolving = true;

    this.rejectedZone.set(zone);
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
        title: '⚠️ Ahí no va',
        text: `Esa pieza no va en ese lugar. Te quedan ${this.gameStatus.lives()} vidas.`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b',
      },
      this.timer
    );

    this.resolving = false;
  }

  private async handleTimeOver(): Promise<void> {
    if (this.gameCompleted()) {
      return;
    }

    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    await gameDialog({
      icon: 'warning',
      title: '⏰ ¡Se acabó el tiempo!',
      text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()}.`,
    });

    this.newRound();
  }

  /**
   * Antes este caso hacia router.navigate(['/kids/level-1']) y despues
   * startGame() sobre el componente que estaba a punto de destruirse, y no
   * devolvia las vidas: el nivel 1 arrancaba con 0 corazones.
   */
  private async handleGameOver(): Promise<void> {
    this.timer.stop();

    const result = await gameDialog({
      icon: 'error',
      title: '💔 ¡Sin vidas!',
      text: 'Perdiste todas tus vidas. ¿Reintentas este nivel?',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      this.gameStatus.resetLives();
      this.newRound();
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
