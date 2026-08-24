import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { GameHeaderComponent } from '../../../Shared/game-header/game-header.component';
import { CountdownTimer } from '../../../../Core/countdown-timer';
import { closeGameDialogs, gameDialog } from '../../../../Core/game-dialog';
import { AudioService } from '../../../../Services/audio.service';
import { GameStatusService } from '../../../../Services/game-status.service';

interface QuizOption {
  text: string;
  correct: boolean;
}

interface QuizQuestion {
  question: string;
  image: string;
  options: QuizOption[];
  explanation: string;
  hint: string;
}

interface QuizLevel {
  title: string;
  questions: QuizQuestion[];
}

const ROUND_SECONDS = 120;
const POINTS_PER_CORRECT = 10;

/*
  Todas las imagenes eran URLs externas: Unsplash, encrypted-tbn0.gstatic.com,
  pngwing, pngtree, lg.com, blogs.es y partesdelacomputadora.org. Eso implicaba:
  el nivel se veia roto sin internet, dependia de siete dominios de terceros
  que pueden cambiar o borrar las imagenes, algunas (los thumbnails de gstatic)
  responden 403 segun el referer, y cada pregunta descargaba cientos de kB.

  Ahora todo sale del propio proyecto: se reutilizan las piezas que ya estaban
  en assets, y para los seis componentes que no tenian ilustracion se anadieron
  SVG locales en assets/img/Juego 6.
*/
const LEVELS: ReadonlyArray<QuizLevel> = [
  {
    title: 'Nivel 1: Componentes Básicos',
    questions: [
      {
        question: 'Es como el cerebro del computador:',
        image: '/assets/img/Juego 4/procesador-Juego4.png',
        options: [
          { text: 'CPU', correct: true },
          { text: 'Disco duro', correct: false },
          { text: 'Fuente de poder', correct: false },
        ],
        explanation:
          "La CPU (Unidad Central de Procesamiento) es conocida como el 'cerebro' del computador porque procesa todas las instrucciones y cálculos necesarios para que el sistema funcione.",
        hint: 'Este componente procesa todas las instrucciones del computador.',
      },
      {
        question: 'Almacena información permanentemente:',
        image: '/assets/img/Juego 4/discoDuro-Juego4.png',
        options: [
          { text: 'Memoria RAM', correct: false },
          { text: 'Disco duro', correct: true },
          { text: 'Tarjeta gráfica', correct: false },
        ],
        explanation:
          'El disco duro es el dispositivo de almacenamiento permanente que guarda todos los datos, programas y el sistema operativo incluso cuando el computador está apagado.',
        hint: 'Guarda tus archivos y programas permanentemente.',
      },
      {
        question: 'Muestra la información visual:',
        image: '/assets/img/Juego 3/Pantalla-juego3.png',
        options: [
          { text: 'Monitor', correct: true },
          { text: 'Teclado', correct: false },
          { text: 'CPU', correct: false },
        ],
        explanation:
          'El monitor es el dispositivo de salida que muestra la información visual generada por la computadora a través de la tarjeta gráfica.',
        hint: 'Donde ves la información visual.',
      },
    ],
  },
  {
    title: 'Nivel 2: Componentes Internos',
    questions: [
      {
        question: 'Procesa los gráficos y videos:',
        image: '/assets/img/Juego 6/gpu.svg',
        options: [
          { text: 'Tarjeta gráfica', correct: true },
          { text: 'Fuente de poder', correct: false },
          { text: 'Disco duro', correct: false },
        ],
        explanation:
          'La tarjeta gráfica o GPU es un componente especializado en el procesamiento de gráficos y videos, aliviando la carga de trabajo de la CPU.',
        hint: 'Esencial para juegos y diseño gráfico.',
      },
      {
        question: 'Proporciona energía a todos los componentes:',
        image: '/assets/img/Juego 4/fuente_poder-Juego4.png',
        options: [
          { text: 'Placa base', correct: false },
          { text: 'Fuente de poder', correct: true },
          { text: 'Procesador', correct: false },
        ],
        explanation:
          'La fuente de poder convierte la corriente alterna de la pared en corriente continua a diferentes voltajes, proporcionando energía estable a todos los componentes del computador.',
        hint: 'Sin esto, el computador no encendería.',
      },
      {
        question: 'Conecta todos los componentes internos:',
        image: '/assets/img/Juego 6/motherboard.svg',
        options: [
          { text: 'Placa base', correct: true },
          { text: 'Memoria RAM', correct: false },
          { text: 'Ventilador', correct: false },
        ],
        explanation:
          'La placa base (motherboard) es la plataforma central que interconecta todos los componentes del computador, permitiendo que se comuniquen entre sí.',
        hint: 'Todo se conecta a esta placa.',
      },
    ],
  },
  {
    title: 'Nivel 3: Memoria y Almacenamiento',
    questions: [
      {
        question: 'Memoria temporal de acceso rápido:',
        image: '/assets/img/Juego 4/ram-Juego4.png',
        options: [
          { text: 'Memoria RAM', correct: true },
          { text: 'Disco duro', correct: false },
          { text: 'Memoria caché', correct: false },
        ],
        explanation:
          'La memoria RAM (Random Access Memory) es una memoria volátil de acceso rápido que almacena temporalmente los datos que la CPU está utilizando activamente.',
        hint: 'Memoria temporal de alta velocidad.',
      },
      {
        question: 'Dispositivo de almacenamiento muy rápido sin partes móviles:',
        image: '/assets/img/Juego 6/ssd.svg',
        options: [
          { text: 'Disco duro tradicional', correct: false },
          { text: 'Unidad de estado sólido (SSD)', correct: true },
          { text: 'Unidad óptica', correct: false },
        ],
        explanation:
          'Las unidades de estado sólido (SSD) usan memoria flash para almacenar datos, lo que las hace mucho más rápidas que los discos duros tradicionales y sin partes móviles.',
        hint: 'Más rápido que un disco duro tradicional.',
      },
      {
        question: 'Memoria ultrarrápida integrada en el procesador:',
        image: '/assets/img/Juego 6/cache.svg',
        options: [
          { text: 'Memoria RAM', correct: false },
          { text: 'Memoria virtual', correct: false },
          { text: 'Memoria caché', correct: true },
        ],
        explanation:
          'La memoria caché es una memoria ultrarrápida integrada en el procesador que almacena copias de datos de uso frecuente para acelerar el acceso del CPU.',
        hint: 'Memoria ultrarrápida cerca del procesador.',
      },
    ],
  },
  {
    title: 'Nivel 4: Dispositivos de Entrada y Salida',
    questions: [
      {
        question: 'Permite introducir texto y comandos:',
        image: '/assets/img/Juego 3/Teclado-Juego3.png',
        options: [
          { text: 'Mouse', correct: false },
          { text: 'Teclado', correct: true },
          { text: 'Monitor', correct: false },
        ],
        explanation:
          'El teclado es un dispositivo de entrada que permite introducir texto, números y comandos al computador mediante la presión de teclas.',
        hint: 'Con este escribes texto.',
      },
      {
        question: 'Dispositivo de entrada para apuntar y seleccionar:',
        image: '/assets/img/Juego 3/Mouse-Juego3.png',
        options: [
          { text: 'Mouse', correct: true },
          { text: 'Impresora', correct: false },
          { text: 'Escáner', correct: false },
        ],
        explanation:
          'El mouse (ratón) es un dispositivo de entrada que controla el cursor en la pantalla y permite seleccionar, arrastrar y hacer clic en elementos.',
        hint: 'Con este apuntas y haces clic.',
      },
      {
        question: 'Convierte documentos físicos en digitales:',
        image: '/assets/img/Juego 6/scanner.svg',
        options: [
          { text: 'Impresora', correct: false },
          { text: 'Monitor', correct: false },
          { text: 'Escáner', correct: true },
        ],
        explanation:
          'El escáner es un dispositivo de entrada que convierte documentos físicos, fotografías o imágenes en formato digital que puede ser procesado por el computador.',
        hint: 'Convierte papel a digital.',
      },
    ],
  },
  {
    title: 'Nivel 5: Componentes Avanzados',
    questions: [
      {
        question: 'Mantiene el computador a temperatura adecuada:',
        image: '/assets/img/Juego 4/disipador-Juego4.png',
        options: [
          { text: 'Sistema de refrigeración', correct: true },
          { text: 'Fuente de poder', correct: false },
          { text: 'Disco duro', correct: false },
        ],
        explanation:
          'El sistema de refrigeración (ventiladores, disipadores de calor y refrigeración líquida) mantiene los componentes a temperaturas seguras para su funcionamiento.',
        hint: 'Mantiene todo fresco y funcionando.',
      },
      {
        question: 'Permite la conexión a redes e internet:',
        image: '/assets/img/Juego 4/tarjeta-red-Juego4.png',
        options: [
          { text: 'Tarjeta de sonido', correct: false },
          { text: 'Tarjeta de red', correct: true },
          { text: 'Tarjeta gráfica', correct: false },
        ],
        explanation:
          'La tarjeta de red (NIC) permite la conexión del computador a redes locales e internet, ya sea por cable (Ethernet) o de forma inalámbrica (Wi-Fi).',
        hint: 'Te conecta a internet.',
      },
      {
        question: 'Produce audio y permite conectar parlantes:',
        image: '/assets/img/Juego 6/soundcard.svg',
        options: [
          { text: 'Tarjeta de sonido', correct: true },
          { text: 'Tarjeta de video', correct: false },
          { text: 'Procesador', correct: false },
        ],
        explanation:
          'La tarjeta de sonido procesa audio y permite conectar parlantes, audífonos y micrófonos al computador, convirtiendo señales digitales en analógicas y viceversa.',
        hint: 'Para escuchar música y sonidos.',
      },
    ],
  },
];

@Component({
  selector: 'app-game6',
  imports: [GameHeaderComponent],
  templateUrl: './game6.component.html',
  styleUrl: './game6.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Game6Component implements OnInit, OnDestroy {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly timer = new CountdownTimer(ROUND_SECONDS, () => void this.handleTimeOver());

  readonly levels = LEVELS;

  readonly currentLevel = signal(0);
  readonly currentQuestion = signal(0);
  readonly localScore = signal(0);
  readonly answered = signal(false);
  readonly selectedOption = signal(-1);
  readonly showExplanation = signal(false);
  readonly feedbackMessage = signal('¡Selecciona la respuesta correcta!');
  readonly feedbackClass = signal('');

  /** Bloquea la interaccion mientras se resuelve el fin de nivel o de juego. */
  private finishing = false;

  /**
   * Puntos que este componente lleva sumados al acumulado global.
   *
   * Hace falta porque game6 puntua nivel interno a nivel interno, no de una vez
   * al final: al reintectar desde cero hay que devolver justo esa cantidad y no
   * tocar lo que el jugador gano en los niveles anteriores de junior.
   */
  private contributed = 0;

  readonly currentLevelData = computed(() => this.levels[this.currentLevel()]);

  /**
   * Pregunta actual.
   *
   * Devuelve undefined cuando el indice se sale del nivel. La plantilla ya no
   * lo lee en ese estado: antes el bloque de explicacion estaba FUERA del
   * *ngIf="!levelCompleted", asi que al pasar la ultima pregunta seguia
   * evaluando `currentQuestionData.explanation` con currentQuestion apuntando
   * mas alla del array y Angular lanzaba
   * "Cannot read properties of undefined (reading 'explanation')".
   */
  readonly currentQuestionData = computed<QuizQuestion | undefined>(
    () => this.currentLevelData()?.questions[this.currentQuestion()]
  );

  readonly progressPercentage = computed(() => {
    const total = this.currentLevelData()?.questions.length ?? 1;
    return ((this.currentQuestion() + 1) / total) * 100;
  });

  readonly levelLabel = computed(
    () => `Nivel ${this.currentLevel() + 1} de ${this.levels.length}`
  );

  readonly isLastLevel = computed(() => this.currentLevel() === this.levels.length - 1);

  ngOnInit(): void {
    this.audio.playTrack('/assets/Audios/Nivel 2-3.mp3', { destroyRef: this.destroyRef });
    this.loadLevel(0);
  }

  ngOnDestroy(): void {
    this.timer.stop();
    closeGameDialogs();
  }

  // ---------- Carga ----------

  private loadLevel(index: number): void {
    this.currentLevel.set(index);
    this.currentQuestion.set(0);
    this.resetQuestionState();
    this.timer.start(ROUND_SECONDS);
  }

  private resetQuestionState(): void {
    this.answered.set(false);
    this.selectedOption.set(-1);
    this.showExplanation.set(false);
    this.feedbackMessage.set('¡Selecciona la respuesta correcta!');
    this.feedbackClass.set('');
  }

  // ---------- Interaccion ----------

  checkAnswer(optionIndex: number, correct: boolean): void {
    if (this.answered() || this.finishing || this.gameStatus.isGameOver()) {
      return;
    }

    this.answered.set(true);
    this.selectedOption.set(optionIndex);
    this.showExplanation.set(true);

    if (correct) {
      this.feedbackMessage.set('✅ ¡Correcto!');
      this.feedbackClass.set('correct');
      this.localScore.update(value => value + POINTS_PER_CORRECT);
      return;
    }

    this.feedbackMessage.set('❌ Incorrecto.');
    this.feedbackClass.set('incorrect');
    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      void this.handleGameOver();
    }
  }

  async nextQuestion(): Promise<void> {
    if (this.finishing) {
      return;
    }

    const total = this.currentLevelData().questions.length;

    if (this.currentQuestion() + 1 >= total) {
      await this.completeLevel();
      return;
    }

    this.currentQuestion.update(value => value + 1);
    this.resetQuestionState();
  }

  /**
   * Letra de la opcion: A, B, C...
   *
   * En la plantilla estaba como `['A', 'B', 'C'][i] ?? '\u2022'`. TypeScript tipa el
   * acceso a un array literal como `string` (no `string | undefined`), asi que
   * el `??` era codigo inalcanzable y el compilador lo avisaba en cada build:
   * "NG8102: The left side of this nullish coalescing operation does not
   * include 'null' or 'undefined'". Calcularlo aqui deja de fijar el numero de
   * opciones a tres.
   */
  optionKey(index: number): string {
    return String.fromCharCode(65 + index);
  }

  async showHint(): Promise<void> {
    const question = this.currentQuestionData();

    if (this.answered() || !question) {
      return;
    }

    /*
      Antes las pistas vivian en un array plano `hints[]` aparte y se indexaban
      sumando las longitudes de los niveles anteriores. Cualquier pregunta que
      se anadiera o reordenara desalineaba TODAS las pistas siguientes. Ahora
      cada pregunta lleva la suya.
    */
    await gameDialog(
      {
        title: '💡 Pista',
        text: question.hint,
        icon: 'info',
        confirmButtonText: 'Entendido',
      },
      this.timer
    );
  }

  // ---------- Fin de nivel y de juego ----------

  /**
   * Cierra el nivel y pasa al siguiente (o termina el juego).
   *
   * Antes habia dos caminos solapados: showLevelCompleted() ponia
   * levelCompleted = true, sumaba el puntaje, mostraba un modal y llamaba a
   * nextLevel(); y ADEMAS la plantilla pintaba una .completed-screen con un
   * boton "Siguiente Nivel" que volvia a llamar a nextLevel(). Si el jugador
   * alcanzaba a pulsarlo, avanzaba dos niveles de golpe. En el ultimo nivel se
   * encadenaban dos modales de felicitacion seguidos.
   */
  private async completeLevel(): Promise<void> {
    this.finishing = true;
    this.timer.stop();

    const timeBonus = this.timer.remaining();
    const earned = this.localScore() + timeBonus;
    this.gameStatus.addScore(earned);
    this.contributed += earned;
    this.localScore.set(0);

    if (this.isLastLevel()) {
      await gameDialog({
        title: '🏆 ¡Juego completado!',
        html: `Terminaste los ${this.levels.length} niveles con <b>${this.gameStatus.score()}</b> puntos.`,
        icon: 'success',
        confirmButtonText: 'Ver resultados',
        confirmButtonColor: '#16a34a',
      });

      /*
        Aqui estaba el POST del puntaje. Se movio a la pantalla de resultados,
        que lo envia una sola vez con reintento y aviso de error.
      */
      void this.router.navigate(['/score']);
      return;
    }

    await gameDialog({
      title: '🏅 ¡Nivel superado!',
      html: `Completaste <b>${this.currentLevelData().title}</b> y sumaste <b>${earned}</b> puntos.`,
      icon: 'success',
      confirmButtonText: 'Siguiente nivel',
      confirmButtonColor: '#16a34a',
    });

    this.finishing = false;
    this.loadLevel(this.currentLevel() + 1);
  }

  private async handleTimeOver(): Promise<void> {
    if (this.finishing) {
      return;
    }

    this.gameStatus.loseLife();

    if (this.gameStatus.isGameOver()) {
      await this.handleGameOver();
      return;
    }

    await gameDialog({
      title: '⏰ ¡Se acabó el tiempo!',
      text: `Perdiste una vida. Te quedan ${this.gameStatus.lives()} ${
        this.gameStatus.lives() === 1 ? 'vida' : 'vidas'
      }.`,
      icon: 'warning',
    });

    /*
      Aqui habia un resetQuestionState() que era un exploit de puntos: dejaba
      `answered` en false SIN avanzar de pregunta, asi que una pregunta ya
      respondida y ya puntuada se podia volver a contestar y sumaba otros
      POINTS_PER_CORRECT. Bastaba con dejar correr el reloj para farmear la
      misma pregunta. Al no tocar el estado, el guard de checkAnswer() sigue en
      pie y el quiz continua donde estaba, igual que en el nivel 2 de junior.
    */
    this.timer.start(ROUND_SECONDS);
  }

  private async handleGameOver(): Promise<void> {
    this.finishing = true;
    this.timer.stop();

    const result = await gameDialog({
      title: '💀 Te quedaste sin vidas',
      text: '¿Quieres intentarlo de nuevo desde el primer nivel?',
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#dc2626',
    });

    if (result.isConfirmed) {
      /*
        Antes: restartRun(), que pone el puntaje GLOBAL a cero. Este es el nivel
        3 de junior, asi que reintentarlo borraba lo ganado en los niveles 1 y 2.

        Pero tampoco basta con resetLives(): a diferencia de los demas juegos,
        este suma al acumulado en cada uno de sus cinco niveles internos
        (completeLevel -> addScore), asi que al reintentar desde el primero hay
        que descontar exactamente lo que este componente ya habia aportado. Para
        eso se lleva la cuenta en `contributed`.
      */
      this.gameStatus.setScore(Math.max(0, this.gameStatus.score() - this.contributed));
      this.contributed = 0;
      this.gameStatus.resetLives();
      this.localScore.set(0);
      this.finishing = false;
      this.loadLevel(0);
    } else {
      this.gameStatus.resetAll();
      void this.router.navigate(['/home']);
    }
  }
}
