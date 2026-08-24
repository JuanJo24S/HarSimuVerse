import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { GameHeaderComponent } from '../../../Shared/game-header/game-header.component';
import { CountdownTimer } from '../../../../Core/countdown-timer';
import { closeGameDialogs, gameDialog, gameToast } from '../../../../Core/game-dialog';
import { AudioService } from '../../../../Services/audio.service';
import { GameStatusService } from '../../../../Services/game-status.service';

interface Pregunta {
  titulo: string;
  imagen: string;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: string;
}

const ROUND_SECONDS = 120;

/**
 * Puntos por respuesta correcta.
 *
 * Antes era `this.localScore++`: un punto por pregunta, cinco en todo el nivel,
 * cuando los otros niveles reparten 10-15 por acierto. El nivel valia
 * practicamente cero en el ranking.
 */
const POINTS_PER_CORRECT = 15;

@Component({
  selector: 'app-game3',
  imports: [GameHeaderComponent],
  templateUrl: './game3.component.html',
  styleUrl: './game3.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Game3Component implements OnInit, OnDestroy {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly timer = new CountdownTimer(ROUND_SECONDS, () => void this.handleTimeOver());

  readonly preguntaActual = signal(0);
  readonly respuestas = signal<Record<number, string>>({});
  readonly juegoTerminado = signal(false);
  readonly localScore = signal(0);

  /** Distingue "termine el quiz" de "me quede sin vidas". */
  readonly perdio = signal(false);

  readonly preguntas: ReadonlyArray<Pregunta> = [
    {
      titulo: '',
      imagen: '/assets/img/Juego 5/procesador.png',
      pregunta: '¿Cuál de las siguientes afirmaciones sobre la CPU es correcta?',
      opciones: [
        'La CPU es responsable de almacenar datos a largo plazo.',
        'La CPU ejecuta instrucciones y procesa datos.',
        'La CPU no tiene ninguna relación con el rendimiento de una computadora.'
      ],
      respuestaCorrecta: 'La CPU ejecuta instrucciones y procesa datos.'
    },
    {
      titulo: '',
      imagen: '/assets/img/Juego 5/disco-duro.png',
      pregunta: '¿Cuál es la función principal de un disco duro en una computadora?',
      opciones: [
        'Almacenar y recuperar datos de forma permanente.',
        'Proporcionar energía a los componentes del sistema.',
        'Procesar instrucciones y realizar cálculos matemáticos.'
      ],
      respuestaCorrecta: 'Almacenar y recuperar datos de forma permanente.'
    },
    {
      titulo: '',
      imagen: '/assets/img/Juego 5/lector_cd.png',
      pregunta: '¿Cuál de las siguientes afirmaciones describe correctamente una función del lector de CD?',
      opciones: [
        'El lector de CD permite reproducir música y videos almacenados en discos compactos.',
        'El lector de CD es responsable de la gestión de la memoria RAM.',
        'El lector de CD puede escribir datos en discos duros.'
      ],
      respuestaCorrecta: 'El lector de CD permite reproducir música y videos almacenados en discos compactos.'
    },
    {
      titulo: '',
      imagen: '/assets/img/Juego 5/tarjeta-red.png',
      pregunta: '¿Cuál es la función principal de una tarjeta de red en una computadora?',
      opciones: [
        'Conectar la computadora a dispositivos de almacenamiento externos.',
        'Procesar y ejecutar instrucciones de programas informáticos.',
        'Permitir que la computadora se comunique y comparta datos en una red.'
      ],
      respuestaCorrecta: 'Permitir que la computadora se comunique y comparta datos en una red.'
    },
    {
      titulo: '',
      imagen: '/assets/img/Juego 5/fuente_poder.png',
      pregunta: '¿Cuál de las siguientes afirmaciones describe correctamente una función de la fuente de poder?',
      opciones: [
        'La fuente de poder transforma la energía de corriente continua en corriente alterna para los componentes del sistema.',
        'La fuente de poder se encarga de procesar datos y ejecutar programas en la computadora.',
        'La fuente de poder convierte la corriente alterna de la red eléctrica en corriente continua para alimentar los componentes de la computadora.'
      ],
      respuestaCorrecta: 'La fuente de poder convierte la corriente alterna de la red eléctrica en corriente continua para alimentar los componentes de la computadora.'
    }
  ];

  readonly preguntaActualData = computed(() => this.preguntas[this.preguntaActual()]);
  readonly esUltimaPregunta = computed(() => this.preguntaActual() === this.preguntas.length - 1);
  readonly esPrimeraPregunta = computed(() => this.preguntaActual() === 0);
  readonly preguntaActualRespondida = computed(
    () => this.respuestas()[this.preguntaActual()] !== undefined
  );
  readonly todasLasPreguntasRespondidas = computed(
    () => Object.keys(this.respuestas()).length === this.preguntas.length
  );
  readonly correctas = computed(
    () =>
      this.preguntas.filter((pregunta, i) => this.respuestas()[i] === pregunta.respuestaCorrecta)
        .length
  );

  ngOnInit(): void {
    this.audio.playTrack('/assets/Audios/Nivel 2-2.mp3', { destroyRef: this.destroyRef });
    /*
      El temporizador arrancaba en ngAfterViewInit junto al IntersectionObserver
      que reproducia el audio. Al no haber observer, arranca aqui.
    */
    this.timer.start(ROUND_SECONDS);
  }

  ngOnDestroy(): void {
    this.timer.stop();
    closeGameDialogs();
  }

  // ---------- Navegacion del cuestionario ----------

  respuestaDe(index: number): string | undefined {
    return this.respuestas()[index];
  }

  esOpcionSeleccionada(opcion: string): boolean {
    return this.respuestas()[this.preguntaActual()] === opcion;
  }

  esRespuestaCorrecta(index: number): boolean {
    return this.respuestas()[index] === this.preguntas[index].respuestaCorrecta;
  }

  preguntaAnterior(): void {
    this.preguntaActual.update(value => Math.max(0, value - 1));
  }

  preguntaSiguiente(): void {
    this.preguntaActual.update(value => Math.min(this.preguntas.length - 1, value + 1));
  }

  seleccionarRespuesta(opcion: string): void {
    if (this.preguntaActualRespondida() || this.juegoTerminado()) {
      return;
    }

    const index = this.preguntaActual();
    this.respuestas.update(current => ({ ...current, [index]: opcion }));

    if (opcion === this.preguntaActualData().respuestaCorrecta) {
      this.localScore.update(value => value + POINTS_PER_CORRECT);
      gameToast({ icon: 'success', title: '¡Correcto! 🎉' });
      return;
    }

    this.gameStatus.loseLife();
    gameToast({ icon: 'error', title: 'Respuesta incorrecta 💔' });

    if (this.gameStatus.isGameOver()) {
      void this.handleGameOver();
    }
  }

  // ---------- Fin del nivel ----------

  /** Boton "Finalizar": cierra el quiz y muestra el resumen. */
  finalizarJuego(): void {
    this.juegoTerminado.set(true);
    this.timer.stop();
  }

  /**
   * Boton "Siguiente nivel" del resumen.
   *
   * Antes este metodo se podia alcanzar tras perder todas las vidas: el resumen
   * se mostraba igual y el boton avanzaba al nivel 3 como si se hubiera
   * aprobado. El guard `perdio()` lo impide, y la plantilla ya ni pinta el boton
   * en ese caso.
   */
  async nextLevel(): Promise<void> {
    if (this.perdio()) {
      return;
    }

    const timeBonus = this.timer.remaining();
    const total = this.localScore() + timeBonus;

    /*
      localScore a cero despues de sumar: la cabecera pinta
      gameStatus.score() + localScore(), asi que dejarlo en `total` mostraba los
      puntos del nivel dos veces mientras el modal estaba abierto.
    */
    this.gameStatus.addScore(total);
    this.localScore.set(0);

    await gameDialog({
      title: '¡Nivel completado!',
      /*
        Antes el texto era `Tu puntaje total es ${this.score + this.localScore}`,
        pero addScore() ya se habia ejecutado, asi que this.score YA incluia
        localScore: el mensaje mostraba el puntaje del nivel contado dos veces.
      */
      html: `Acertaste <b>${this.correctas()}</b> de <b>${this.preguntas.length}</b> y sumaste <b>${total}</b> puntos.`,
      icon: 'success',
      confirmButtonText: 'Continuar',
      confirmButtonColor: '#16a34a',
    });

    void this.router.navigate(['/junior/level-3']);
  }

  /** Reintenta el nivel completo. */
  reiniciarJuego(): void {
    this.preguntaActual.set(0);
    this.respuestas.set({});
    this.juegoTerminado.set(false);
    this.perdio.set(false);
    this.localScore.set(0);
    this.gameStatus.resetLives();
    this.timer.start(ROUND_SECONDS);
  }

  private async handleTimeOver(): Promise<void> {
    if (this.juegoTerminado()) {
      return;
    }

    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    /*
      Antes, al agotarse el tiempo con vidas restantes, el reloj volvia a 120 y
      el cuestionario seguia igual: se podia dejar correr el reloj tres veces
      sin responder nada y el nivel nunca terminaba de verdad. Ahora cada
      agotamiento cuesta una vida y avisa, pero el quiz continua donde estaba
      (las respuestas dadas se conservan).
    */
    await gameDialog({
      icon: 'warning',
      title: '⏳ Tiempo agotado',
      text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()}. El cuestionario sigue donde lo dejaste.`,
    });

    this.timer.start(ROUND_SECONDS);
  }

  private async handleGameOver(): Promise<void> {
    this.timer.stop();
    this.perdio.set(true);
    this.juegoTerminado.set(true);

    const result = await gameDialog({
      icon: 'error',
      title: '💀 Sin vidas',
      text: 'Te quedaste sin vidas en este nivel. ¿Quieres intentarlo otra vez?',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      this.reiniciarJuego();
    } else {
      this.gameStatus.resetAll();
      void this.router.navigate(['/home']);
    }
  }
}
