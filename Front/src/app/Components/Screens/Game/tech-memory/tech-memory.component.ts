import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CountdownTimer } from '../../../../Core/countdown-timer';
import {
  DragDropSelection,
  allowDrop,
  readDraggedId,
  writeDraggedId,
} from '../../../../Core/drag-drop-selection';
import { closeGameDialogs, gameDialog } from '../../../../Core/game-dialog';
import { shuffle } from '../../../../Core/shuffle';
import { GameHeaderComponent } from '../../../Shared/game-header/game-header.component';
import { AudioService } from '../../../../Services/audio.service';
import { GameStatusService } from '../../../../Services/game-status.service';

interface GameItem {
  id: string;
  name: string;
  iconClass: string;
  matched: boolean;
  src: string;
}

/** Segundos por ronda. */
const ROUND_SECONDS = 120;

/** Puntos por pareja acertada. */
const POINTS_PER_MATCH = 10;

@Component({
  selector: 'app-tech-memory',
  imports: [GameHeaderComponent],
  templateUrl: './tech-memory.component.html',
  styleUrl: './tech-memory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechMemoryComponent implements OnInit, OnDestroy {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  /** Reemplaza el setInterval manual: no duplica intervalos y se pausa con los
   *  modales (antes el reloj corria mientras se leia "perdiste una vida"). */
  readonly timer = new CountdownTimer(ROUND_SECONDS, () => void this.handleTimeOver());

  /** Soporte tactil: tocar etiqueta y luego tocar icono. */
  readonly selection = new DragDropSelection();

  readonly localScore = signal(0);
  readonly shuffledNames = signal<string[]>([]);
  readonly items = signal<GameItem[]>([]);

  /** Evita que dos eventos casi simultaneos resten dos vidas por un solo error. */
  private resolving = false;

  private readonly baseItems: readonly GameItem[] = [
    { id: 'android', name: 'Android', iconClass: 'android-icon', matched: false, src: '/assets/img/Juego 1/android.png' },
    { id: 'pantalla', name: 'Pantalla', iconClass: 'pantalla-icon', matched: false, src: '/assets/img/Juego 1/Pantalla-Juego1.png' },
    { id: 'teclado', name: 'Teclado', iconClass: 'teclado-icon', matched: false, src: '/assets/img/Juego 1/Teclado-Juego1.png' },
    { id: 'instagram', name: 'Instagram', iconClass: 'instagram-icon', matched: false, src: '/assets/img/Juego 1/Instagram-Juego1.png' },
    { id: 'facebook', name: 'Facebook', iconClass: 'facebook-icon', matched: false, src: '/assets/img/Juego 1/facebook.png' },
    { id: 'torre', name: 'Torre', iconClass: 'torre-icon', matched: false, src: '/assets/img/Juego 1/Torre-Juego1.png' },
    { id: 'youtube', name: 'Youtube', iconClass: 'youtube-icon', matched: false, src: '/assets/img/Juego 1/Youtube-Juego1.png' },
    { id: 'tiktok', name: 'Tiktok', iconClass: 'tiktok-icon', matched: false, src: '/assets/img/Juego 1/tik tok.png' },
    { id: 'papelera', name: 'Papelera', iconClass: 'papelera-icon', matched: false, src: '/assets/img/Juego 1/Papelera-Juego1.png' },
    { id: 'chrome', name: 'Chrome', iconClass: 'chrome-icon', matched: false, src: '/assets/img/Juego 1/Google.png' },
    { id: 'cargador', name: 'Cargador', iconClass: 'cargador-icon', matched: false, src: '/assets/img/Juego 1/Cargador-Juego1.png' },
    { id: 'carpeta', name: 'Carpeta', iconClass: 'carpeta-icon', matched: false, src: '/assets/img/Juego 1/Carpeta-Explorador de archivos-Juego1.png' },
  ];

  ngOnInit(): void {
    /*
      startGame() se llamaba desde el CONSTRUCTOR. Eso arrancaba el reloj antes
      de que existiera la vista y, al ser el nivel 1, reseteaba vidas y puntaje
      cada vez que Angular instanciaba el componente.
    */
    this.audio.playTrack('/assets/Audios/Juego1-1.mp3', { destroyRef: this.destroyRef });
    this.startGame();
  }

  ngOnDestroy(): void {
    this.timer.stop();
    // Sin esto, al navegar con un modal abierto el modal quedaba flotando
    // sobre la pantalla siguiente.
    closeGameDialogs();
  }

  // ---------- Ciclo del juego ----------

  /** Partida nueva: reinicia vidas, puntaje del nivel y tablero. */
  private startGame(): void {
    this.gameStatus.resetLives();
    this.newRound();
  }

  /**
   * Ronda nueva conservando las vidas restantes.
   *
   * El resetGame() anterior no restauraba las vidas, asi que al quedarse sin
   * ninguna el tablero se reiniciaba con 0 corazones: cualquier fallo dejaba
   * el juego en un estado del que no se podia salir ni ganar.
   */
  private newRound(): void {
    this.localScore.set(0);
    this.selection.clear();
    this.resolving = false;
    this.items.set(this.baseItems.map(item => ({ ...item, matched: false })));
    this.shuffledNames.set(shuffle(this.baseItems.map(item => item.name)));
    this.timer.start(ROUND_SECONDS);
  }

  /** Boton "Reiniciar juego" de la plantilla. */
  restart(): void {
    this.startGame();
  }

  // ---------- Interaccion ----------

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
    this.selection.clear();
  }

  onDragOver(event: DragEvent): void {
    allowDrop(event);
  }

  /** Toque sobre una etiqueta (ruta tactil). */
  onLabelTap(name: string): void {
    this.selection.select(name);
  }

  onDrop(event: DragEvent, target: GameItem): void {
    event.preventDefault();
    void this.place(this.selection.resolveSource(readDraggedId(event)), target);
  }

  /** Toque sobre un icono (ruta tactil). */
  onTargetTap(target: GameItem): void {
    if (this.selection.selected() === null) {
      return;
    }
    void this.place(this.selection.resolveSource(null), target);
  }

  /**
   * Punto unico de colocacion: el drag de escritorio y el toque en tablet
   * acaban aqui, asi que la puntuacion y las vidas se calculan igual en ambos.
   */
  private async place(source: string | null, target: GameItem): Promise<void> {
    if (source === null || this.resolving || target.matched) {
      return;
    }

    const isMatch = source.toLowerCase() === target.name.toLowerCase();
    this.selection.clear();

    if (isMatch) {
      this.items.update(items =>
        items.map(item => (item.id === target.id ? { ...item, matched: true } : item))
      );
      this.shuffledNames.update(names => names.filter(name => name !== source));

      /*
        La formula anterior era Math.max(5, Math.floor(100 / (tiempo + 1))):
        premiaba tener MENOS tiempo restante, justo al contrario de lo
        pretendido, y con 120s daba floor(100/121) = 0, asi que en la practica
        siempre otorgaba exactamente 5 puntos.
      */
      this.localScore.update(value => value + POINTS_PER_MATCH);

      if (this.shuffledNames().length === 0) {
        await this.handleRoundWon();
      }
      return;
    }

    await this.handleWrongMatch();
  }

  private async handleRoundWon(): Promise<void> {
    this.timer.stop();

    // Bonus por rapidez: un segundo restante = un punto.
    const timeBonus = this.timer.remaining();
    const total = this.localScore() + timeBonus;

    /*
      Antes: this.gameStatus.addScore(this.score + this.localScore).
      addScore() ya SUMA sobre el puntaje acumulado, asi que pasarle
      score + localScore lo contaba doble (score final = 2*score + localScore).

      Y quedaba un segundo doble conteo, este solo visual: la cabecera pinta
      gameStatus.score() + localScore(), asi que dejar localScore en `total`
      mostraba los puntos del nivel dos veces mientras el modal estaba abierto.
      Por eso se pone a cero justo despues de sumarlos al acumulado.
    */
    this.gameStatus.addScore(total);
    this.localScore.set(0);

    await gameDialog({
      icon: 'success',
      title: '🎉 ¡Felicidades!',
      html: `Completaste el nivel con <b>${total}</b> puntos (incluye <b>${timeBonus}</b> de bonus por rapidez).`,
      confirmButtonText: 'Siguiente nivel',
      confirmButtonColor: '#16a34a',
    });

    void this.router.navigate(['/kids/level-2']);
  }

  private async handleWrongMatch(): Promise<void> {
    this.resolving = true;
    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    await gameDialog(
      {
        icon: 'warning',
        title: '⚠️ Casi',
        text: `Esa no es la pareja correcta. Te quedan ${this.gameStatus.lives()} vidas.`,
        confirmButtonText: 'Intentar de nuevo',
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
      title: '⏰ ¡Se acabó el tiempo!',
      text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()} ${
        this.gameStatus.lives() === 1 ? 'vida' : 'vidas'
      }.`,
    });

    this.newRound();
  }

  /**
   * Sin vidas: se ofrece reintentar (con vidas nuevas) o salir.
   *
   * Antes este caso llamaba a resetGame() sin devolver las vidas, o navegaba a
   * la ruta del propio nivel confiando en que el componente se reconstruyera.
   */
  private async handleGameOver(): Promise<void> {
    this.timer.stop();

    const result = await gameDialog({
      icon: 'error',
      title: '💀 ¡Sin vidas!',
      text: 'Perdiste todas tus vidas. ¿Quieres intentarlo otra vez?',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      this.gameStatus.restartRun();
      this.startGame();
    } else {
      this.gameStatus.resetAll();
      void this.router.navigate(['/home']);
    }
  }
}
