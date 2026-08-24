import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { GameHeaderComponent } from '../../../Shared/game-header/game-header.component';
import { CountdownTimer } from '../../../../Core/countdown-timer';
import { closeGameDialogs, gameDialog } from '../../../../Core/game-dialog';
import { shuffle } from '../../../../Core/shuffle';
import { AudioService } from '../../../../Services/audio.service';
import { GameStatusService } from '../../../../Services/game-status.service';

interface Carta {
  /** Identificador de la pareja: dos cartas con el mismo par son iguales. */
  par: number;
  nombre: string;
  img: string;
  volteada: boolean;
  encontrada: boolean;
}

const ROUND_SECONDS = 120;
const POINTS_PER_PAIR = 10;

/**
 * Las 12 parejas del tablero.
 *
 * Antes las imagenes eran URLs de i.ibb.co inyectadas como HTML crudo con
 * [innerHTML] (`'<img src="https://i.ibb.co/..." width="64%">'`). Eso traia
 * tres problemas: el juego dejaba de funcionar sin internet o si el hosting
 * gratuito caia, cada carta pasaba por el sanitizador de Angular en cada
 * render, y el tamano se definia con un width en porcentaje dentro del string.
 * Estas son las mismas piezas que ya estaban en el repositorio.
 */
const PAREJAS: ReadonlyArray<{ nombre: string; img: string }> = [
  { nombre: 'Procesador', img: '/assets/img/Juego 4/procesador-Juego4.png' },
  { nombre: 'Memoria RAM', img: '/assets/img/Juego 4/ram-Juego4.png' },
  { nombre: 'Disco duro', img: '/assets/img/Juego 4/discoDuro-Juego4.png' },
  { nombre: 'Fuente de poder', img: '/assets/img/Juego 4/fuente_poder-Juego4.png' },
  { nombre: 'Disipador', img: '/assets/img/Juego 4/disipador-Juego4.png' },
  { nombre: 'Lector de CD', img: '/assets/img/Juego 4/lector_cd-Juego4.png' },
  { nombre: 'Tarjeta de red', img: '/assets/img/Juego 4/tarjeta-red-Juego4.png' },
  { nombre: 'Gabinete', img: '/assets/img/Juego 4/CPU-Juego4.png' },
  { nombre: 'Monitor', img: '/assets/img/Juego 3/Pantalla-juego3.png' },
  { nombre: 'Teclado', img: '/assets/img/Juego 3/Teclado-Juego3.png' },
  { nombre: 'Mouse', img: '/assets/img/Juego 3/Mouse-Juego3.png' },
  { nombre: 'Torre', img: '/assets/img/Juego 3/Torre-Juego3.png' },
];

@Component({
  selector: 'app-game1',
  imports: [GameHeaderComponent],
  templateUrl: './game1.component.html',
  styleUrl: './game1.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Game1Component implements OnInit, OnDestroy {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly timer = new CountdownTimer(ROUND_SECONDS, () => void this.handleTimeOver());

  readonly tarjetas = signal<Carta[]>([]);
  readonly localScore = signal(0);
  readonly aciertos = signal(0);

  private selecciones: number[] = [];
  /** Bloquea clicks mientras se evalua una pareja o hay un modal abierto. */
  private bloqueado = false;
  private revealHandle: ReturnType<typeof setTimeout> | null = null;

  get totalParejas(): number {
    return PAREJAS.length;
  }

  ngOnInit(): void {
    this.audio.playTrack('/assets/Audios/Juego1-2.mp3', { destroyRef: this.destroyRef });
    this.nuevaRonda();
  }

  ngOnDestroy(): void {
    this.timer.stop();
    this.clearReveal();
    closeGameDialogs();
  }

  /**
   * Boton "Revolver cartas".
   *
   * Antes llamaba a generarTablero(), que arrancaba OTRO setInterval sin
   * limpiar el anterior: al segundo click el reloj bajaba de dos en dos y al
   * tercero de tres en tres. Ademas no reiniciaba `aciertos` ni `localScore`,
   * asi que revolver despues de encontrar parejas dejaba el contador de
   * aciertos alto y el nivel se completaba con solo una o dos parejas nuevas.
   */
  revolver(): void {
    this.nuevaRonda();
  }

  private nuevaRonda(): void {
    this.clearReveal();
    this.selecciones = [];
    this.bloqueado = false;
    this.aciertos.set(0);
    this.localScore.set(0);

    const mazo: Carta[] = PAREJAS.flatMap((pareja, index) => [
      { par: index, nombre: pareja.nombre, img: pareja.img, volteada: false, encontrada: false },
      { par: index, nombre: pareja.nombre, img: pareja.img, volteada: false, encontrada: false },
    ]);

    this.tarjetas.set(shuffle(mazo));
    // CountdownTimer.start() siempre limpia el intervalo previo.
    this.timer.start(ROUND_SECONDS);
  }

  seleccionarTarjeta(indice: number): void {
    if (this.bloqueado || this.selecciones.length >= 2) {
      return;
    }

    const carta = this.tarjetas()[indice];
    if (!carta || carta.volteada || carta.encontrada) {
      return;
    }

    this.setCarta(indice, { volteada: true });
    this.selecciones.push(indice);

    if (this.selecciones.length === 2) {
      this.bloqueado = true;
      this.revealHandle = setTimeout(() => void this.evaluarSeleccion(), 800);
    }
  }

  private async evaluarSeleccion(): Promise<void> {
    this.clearReveal();

    const [a, b] = this.selecciones;
    this.selecciones = [];

    const cartaA = this.tarjetas()[a];
    const cartaB = this.tarjetas()[b];

    if (!cartaA || !cartaB) {
      this.bloqueado = false;
      return;
    }

    if (cartaA.par === cartaB.par) {
      this.setCarta(a, { encontrada: true });
      this.setCarta(b, { encontrada: true });
      this.localScore.update(value => value + POINTS_PER_PAIR);
      this.aciertos.update(value => value + 1);
      this.bloqueado = false;

      if (this.aciertos() === this.totalParejas) {
        await this.completarNivel();
      }
      return;
    }

    // Se vuelven a tapar.
    this.setCarta(a, { volteada: false });
    this.setCarta(b, { volteada: false });

    /*
      Aqui estaba el bug mas grave del nivel: al fallar una pareja el codigo
      solo destapaba las cartas y comprobaba `if (this.lives <= 0)`. Nunca
      llamaba a loseLife(), asi que las vidas jamas bajaban por un error y esa
      comprobacion era codigo muerto. El nivel no se podia perder.
    */
    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    await gameDialog(
      {
        icon: 'warning',
        title: '⚠️ No son pareja',
        text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()}.`,
        confirmButtonText: 'Seguir jugando',
        confirmButtonColor: '#f59e0b',
      },
      this.timer
    );

    this.bloqueado = false;
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
      title: '¡Felicitaciones! 🎉',
      html: `Encontraste las ${this.totalParejas} parejas y sumaste <b>${total}</b> puntos.`,
      confirmButtonText: 'Siguiente nivel',
      confirmButtonColor: '#16a34a',
    });

    void this.router.navigate(['/kids/level-3']);
  }

  private async handleTimeOver(): Promise<void> {
    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    /*
      Antes el tiempo agotado disparaba finalizarJuego(), que mostraba DOS
      modales seguidos ("Se acabo el tiempo" y despues "Juego terminado") y
      reiniciaba el reloj sin volver a tapar las cartas: la ronda nueva
      empezaba con el tablero a medio resolver.
    */
    await gameDialog({
      icon: 'warning',
      title: '⏰ ¡Se acabó el tiempo!',
      text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()}.`,
    });

    this.nuevaRonda();
  }

  private async handleGameOver(): Promise<void> {
    this.timer.stop();

    const result = await gameDialog({
      icon: 'error',
      title: 'Juego terminado 😢',
      text: 'Te quedaste sin vidas. ¿Quieres intentarlo otra vez?',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      /*
        Antes esto era restartRun(), que ademas de devolver las vidas pone el
        puntaje GLOBAL a cero. Este es el nivel 2 de kids: reintentarlo borraba
        todo lo que el jugador habia ganado en el nivel 1. Solo hay que devolver
        las vidas; los puntos del nivel actual aun no se han sumado al acumulado
        (eso pasa en completarNivel), asi que no hay nada mas que descontar.
      */
      this.gameStatus.resetLives();
      this.nuevaRonda();
    } else {
      this.gameStatus.resetAll();
      void this.router.navigate(['/home']);
    }
  }

  /** Actualiza una carta sin mutar el array (necesario con OnPush + signals). */
  private setCarta(indice: number, patch: Partial<Carta>): void {
    this.tarjetas.update(cartas =>
      cartas.map((carta, i) => (i === indice ? { ...carta, ...patch } : carta))
    );
  }

  private clearReveal(): void {
    if (this.revealHandle !== null) {
      clearTimeout(this.revealHandle);
      this.revealHandle = null;
    }
  }
}
