import { GameDataService } from './../../../../Services/game-data.service';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { GameStatusService } from '../../../../Services/game-status.service';
import { PartialData } from '../../../../Models/data';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface QuizOption {
  text: string;
  correct: boolean;
}

interface QuizQuestion {
  question: string;
  image: string;
  options: QuizOption[];
  explanation: string;
}

interface QuizLevel {
  title: string;
  questions: QuizQuestion[];
}

@Component({
  selector: 'app-game6',
  imports: [CommonModule],
  templateUrl: './game6.component.html',
  styleUrl: './game6.component.css'
})
export class Game6Component implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private gameStatus: GameStatusService,
    private gameData: GameDataService,
    private router: Router
  ) { }

  currentLevel = 0;
  currentQuestion = 0;
  localScore = 0;
  answered = false;
  selectedOption = -1;
  showExplanation = false;
  levelCompleted = false;
  feedbackMessage = '¡Selecciona la respuesta correcta!';
  feedbackClass = '';
  sonidoActivo = true;

  tiempo = 0;
  intervaloTiempo: any;
  private observer!: IntersectionObserver;
  private audio = new Audio('/assets/Audios/Nivel 2-3.mp3');

  get nickname() {
    return this.gameStatus.nickname();
  }

  get score() {
    return this.gameStatus.score();
  }

  get lives() {
    return this.gameStatus.lives();
  }

  get livesArray() {
    return Array(this.lives).fill(0);
  }

  get difficult() {
    return this.gameStatus.difficult();
  }

  // === tus niveles ===
  levels: QuizLevel[] = [
    {
      title: "Nivel 1: Componentes Básicos",
      questions: [
        {
          question: "Es como el cerebro del computador:",
          image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y3B1JTIwY2hpcHxlbnwwfHwwfHx8MA%3D%3D",
          options: [
            { text: "CPU", correct: true },
            { text: "Disco duro", correct: false },
            { text: "Fuente de poder", correct: false }
          ],
          explanation: "La CPU (Unidad Central de Procesamiento) es conocida como el 'cerebro' del computador porque procesa todas las instrucciones y cálculos necesarios para que el sistema funcione."
        },
        {
          question: "Almacena información permanentemente:",
          image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGFyZCUyMGRyaXZlfGVufDB8fDB8fHww",
          options: [
            { text: "Memoria RAM", correct: false },
            { text: "Disco duro", correct: true },
            { text: "Tarjeta gráfica", correct: false }
          ],
          explanation: "El disco duro es el dispositivo de almacenamiento permanente que guarda todos los datos, programas y el sistema operativo incluso cuando el computador está apagado."
        },
        {
          question: "Muestra la información visual:",
          image: "https://www.lg.com/content/dam/channel/wcms/co/images/monitores/24mp400-b_awp_escb_co_c/gallery/DZ-1.jpg",
          options: [
            { text: "Monitor", correct: true },
            { text: "Teclado", correct: false },
            { text: "CPU", correct: false }
          ],
          explanation: "El monitor es el dispositivo de salida que muestra la información visual generada por la computadora a través de la tarjeta gráfica."
        }
      ]
    },
    {
      title: "Nivel 2: Componentes Internos",
      questions: [
        {
          question: "Procesa los gráficos y videos:",
          image: "https://images.unsplash.com/photo-1591405351990-4726e331f141?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z3JhcGhpY3MlMjBjYXJkfGVufDB8fDB8fHww",
          options: [
            { text: "Tarjeta gráfica", correct: true },
            { text: "Fuente de poder", correct: false },
            { text: "Disco duro", correct: false }
          ],
          explanation: "La tarjeta gráfica o GPU es un componente especializado en el procesamiento de gráficos y videos, aliviando la carga de trabajo de la CPU."
        },
        {
          question: "Proporciona energía a todos los componentes:",
          image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr3l1YhmPheDdXtSY4NTkntErdvJWvobK4pw&s",
          options: [
            { text: "Placa base", correct: false },
            { text: "Fuente de poder", correct: true },
            { text: "Procesador", correct: false }
          ],
          explanation: "La fuente de poder convierte la corriente alterna de la pared en corriente continua a diferentes voltajes, proporcionando energía estable a todos los componentes del computador."
        },
        {
          question: "Conecta todos los componentes internos:",
          image: "https://images.unsplash.com/photo-1531594896955-305cf81269f1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bW90aGVyYm9hcmR8ZW58MHx8MHx8fDA%3D",
          options: [
            { text: "Placa base", correct: true },
            { text: "Memoria RAM", correct: false },
            { text: "Ventilador", correct: false }
          ],
          explanation: "La placa base (motherboard) es la plataforma central que interconecta todos los componentes del computador, permitiendo que se comuniquen entre sí."
        }
      ]
    },
    {
      title: "Nivel 3: Memoria y Almacenamiento",
      questions: [
        {
          question: "Memoria temporal de acceso rápido:",
          image: "https://w7.pngwing.com/pngs/929/572/png-transparent-ram-computer-memory-flash-memory-rom-computer-computer-ram-electronic-device.png",
          options: [
            { text: "Memoria RAM", correct: true },
            { text: "Disco duro", correct: false },
            { text: "Memoria caché", correct: false }
          ],
          explanation: "La memoria RAM (Random Access Memory) es una memoria volátil de acceso rápido que almacena temporalmente los datos que la CPU está utilizando activamente."
        },
        {
          question: "Dispositivo de almacenamiento muy rápido sin partes móviles:",
          image: "https://png.pngtree.com/png-vector/20230328/ourmid/pngtree-ssd-solid-drive-computer-storage-vector-png-image_6672878.png",
          options: [
            { text: "Disco duro tradicional", correct: false },
            { text: "Unidad de estado sólido (SSD)", correct: true },
            { text: "Unidad óptica", correct: false }
          ],
          explanation: "Las unidades de estado sólido (SSD) usan memoria flash para almacenar datos, lo que las hace mucho más rápidas que los discos duros tradicionales y sin partes móviles."
        },
        {
          question: "Memoria ultrarrápida integrada en el procesador:",
          image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2FjaGUlMjBtZW1vcnl8ZW58MHx8MHx8fDA%3D",
          options: [
            { text: "Memoria RAM", correct: false },
            { text: "Memoria virtual", correct: false },
            { text: "Memoria caché", correct: true }
          ],
          explanation: "La memoria caché es una memoria ultrarrápida integrada en el procesador que almacena copias de datos de uso frecuente para acelerar el acceso del CPU."
        }
      ]
    },
    {
      title: "Nivel 4: Dispositivos de Entrada/Salida",
      questions: [
        {
          question: "Permite introducir texto y comandos:",
          image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8a2V5Ym9hcmR8ZW58MHx8MHx8fDA%3D",
          options: [
            { text: "Mouse", correct: false },
            { text: "Teclado", correct: true },
            { text: "Monitor", correct: false }
          ],
          explanation: "El teclado es un dispositivo de entrada que permite introducir texto, números y comandos al computador mediante la presión de teclas."
        },
        {
          question: "Dispositivo de entrada para apuntar y seleccionar:",
          image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bW91c2V8ZW58MHx8MHx8fDA%3D",
          options: [
            { text: "Mouse", correct: true },
            { text: "Impresora", correct: false },
            { text: "Escáner", correct: false }
          ],
          explanation: "El mouse (ratón) es un dispositivo de entrada que controla el cursor en la pantalla y permite seleccionar, arrastrar y hacer clic en elementos."
        },
        {
          question: "Convierte documentos físicos en digitales:",
          image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2Nhbm5lcnxlbnwwfHwwfHx8MA%3D%3D",
          options: [
            { text: "Impresora", correct: false },
            { text: "Monitor", correct: false },
            { text: "Escáner", correct: true }
          ],
          explanation: "El escáner es un dispositivo de entrada que convierte documentos físicos, fotografías o imágenes en formato digital que puede ser procesado por el computador."
        }
      ]
    },
    {
      title: "Nivel 5: Componentes Avanzados",
      questions: [
        {
          question: "Mantiene el computador a temperatura adecuada:",
          image: "https://i.blogs.es/46d660/81l-qmtggkl._ac_sl1500_/450_1000.webp",
          options: [
            { text: "Sistema de refrigeración", correct: true },
            { text: "Fuente de poder", correct: false },
            { text: "Disco duro", correct: false }
          ],
          explanation: "El sistema de refrigeración (que puede incluir ventiladores, disipadores de calor y refrigeración líquida) mantiene los componentes a temperaturas seguras para su funcionamiento."
        },
        {
          question: "Permite la conexión a redes e internet:",
          image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRj9AoHDZZP5xgTF1I6Bkctu3e2a-VAW5qRdw&s",
          options: [
            { text: "Tarjeta de sonido", correct: false },
            { text: "Tarjeta de red", correct: true },
            { text: "Tarjeta gráfica", correct: false }
          ],
          explanation: "La tarjeta de red (NIC) permite la conexión del computador a redes locales e internet, ya sea por cable (Ethernet) o de forma inalámbrica (Wi-Fi)."
        },
        {
          question: "Produce audio y permite conectar parlantes:",
          image: "https://partesdelacomputadora.org/wp-content/uploads/2019/07/Tarjetas-de-sonido-semiprofesionales.jpg",
          options: [
            { text: "Tarjeta de sonido", correct: true },
            { text: "Tarjeta de video", correct: false },
            { text: "Procesador", correct: false }
          ],
          explanation: "La tarjeta de sonido procesa audio y permite conectar parlantes, audífonos y micrófonos al computador, convirtiendo señales digitales en analógicas y viceversa."
        }
      ]
    }
  ];

  hints: string[] = [
    "Pista: Este componente procesa todas las instrucciones del computador.",
    "Pista: Guarda tus archivos y programas permanentemente.",
    "Pista: Donde ves la información visual.",
    "Pista: Esencial para juegos y diseño gráfico.",
    "Pista: Sin esto, el computador no encendería.",
    "Pista: Todo se conecta a esta placa.",
    "Pista: Memoria temporal de alta velocidad.",
    "Pista: Más rápido que un disco duro tradicional.",
    "Pista: Memoria ultrarrápida cerca del procesador.",
    "Pista: Con este escribes texto.",
    "Pista: Con este apuntas y haces clic.",
    "Pista: Convierte papel a digital.",
    "Pista: Mantiene todo fresco y funcionando.",
    "Pista: Te conecta a internet.",
    "Pista: Para escuchar música y sonidos."
  ];


  // === ciclo de vida ===
  ngOnInit(): void {
    this.loadLevel(0);
    this.startTimer();
    this.audio.load();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) this.audio.play();
        else this.audio.pause();
      });
    }, { threshold: 0.5 });
    this.observer.observe(document.querySelector('app-game6') as Element);
  }

  ngOnDestroy(): void {
    this.audio.pause();
    clearInterval(this.intervaloTiempo);
    if (this.observer) this.observer.disconnect();
  }

  startTimer(): void {
    this.tiempo = 120;
    clearInterval(this.intervaloTiempo);

    this.intervaloTiempo = setInterval(() => {
      this.tiempo--;

      if (this.tiempo <= 0) {
        clearInterval(this.intervaloTiempo);
        this.handleTimeOver();
      }
    }, 1000);
  }

handleTimeOver(): void {
  this.gameStatus.loseLife();

  if (this.lives > 0) {
    Swal.fire({
      title: '⏰ ¡Se acabó el tiempo!',
      text: `Perdiste una vida. Te quedan ${this.lives} ${this.lives === 1 ? 'vida' : 'vidas'}.`,
      icon: 'warning',
      confirmButtonText: 'Continuar',
      confirmButtonColor: '#3085d6',
      background: '#fff5f5'
    }).then(() => {
      this.loadQuestion();
      this.resetTimer();
    });
  } else {
    Swal.fire({
      title: '💀 ¡Te quedaste sin vidas!',
      text: '¿Quieres intentarlo de nuevo?',
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#d33',
      background: '#fff5f5'
    }).then(result => {
      if (result.isConfirmed) {
        this.loadLevel(0);
        this.router.navigate(['/junior/level-1']);
        this.gameStatus.setScore(0);
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}


  resetTimer(): void {
    clearInterval(this.intervaloTiempo);
    this.startTimer();
  }

  get currentLevelData(): QuizLevel {
    return this.levels[this.currentLevel];
  }

  get currentQuestionData(): QuizQuestion {
    return this.currentLevelData.questions[this.currentQuestion];
  }

  get progressPercentage(): number {
    return ((this.currentQuestion + 1) / this.currentLevelData.questions.length) * 100;
  }

  loadLevel(index: number): void {
    this.currentLevel = index;
    this.currentQuestion = 0;
    this.levelCompleted = false;
    this.localScore = 0;
    this.loadQuestion();
    this.resetTimer();
  }

  loadQuestion(): void {
    this.answered = false;
    this.selectedOption = -1;
    this.showExplanation = false;
    this.feedbackMessage = '¡Selecciona la respuesta correcta!';
    this.feedbackClass = '';
  }

  checkAnswer(optionIndex: number, correct: boolean): void {
    if (this.answered || this.lives <= 0) return;
    this.answered = true;
    this.selectedOption = optionIndex;
    this.showExplanation = true;

    if (correct) {
      this.feedbackMessage = '✅ ¡Correcto!';
      this.feedbackClass = 'correct';
      this.localScore += 10;
    } else {
      this.feedbackMessage = '❌ Incorrecto.';
      this.feedbackClass = 'incorrect';
      this.gameStatus.loseLife();
      if (this.lives <= 0) {
        this.gameOverAlert();
      }
    }
  }

  nextQuestion(): void {
    this.currentQuestion++;
    if (this.currentQuestion >= this.currentLevelData.questions.length) {
      this.showLevelCompleted();
    } else {
      this.loadQuestion();
    }
  }

  async showLevelCompleted(): Promise<void> {
    this.levelCompleted = true;
    clearInterval(this.intervaloTiempo);
    this.gameStatus.addScore(this.localScore);

    const isLast = this.currentLevel === this.levels.length - 1;
    const title = isLast ? '🎉 ¡Juego completado!' : '🏅 ¡Nivel superado!';
    const text = isLast
      ? `Terminaste todos los niveles con ${this.gameStatus.score()} puntos totales.`
      : `Has completado el ${this.currentLevelData.title} con ${this.localScore} puntos.`;

    await Swal.fire({
      title,
      text,
      icon: isLast ? 'success' : 'info',
      confirmButtonText: isLast ? 'Finalizar' : 'Siguiente nivel',
      confirmButtonColor: '#28a745',
      background: '#f5faff',
      showClass: { popup: 'animate__animated animate__fadeInDown' },
      hideClass: { popup: 'animate__animated animate__fadeOutUp' }
    });

    if (isLast) {
      this.handleGameCompleted();
    } else {
      this.nextLevel();
    }
  }

  handleGameCompleted(): void {
    const payload: PartialData = {
      difficult: this.difficult,
      nickname: this.nickname,
      score: this.score
    };
    this.setScore(payload);
    Swal.fire({
      title: '🏆 ¡Felicidades!',
      text: 'Has completado todos los niveles del juego.',
      icon: 'success',
      confirmButtonText: 'Volver al inicio'
    }).then(() => this.router.navigate(['/score']));
  }

  gameOverAlert(): void {
    clearInterval(this.intervaloTiempo);
    Swal.fire({
      title: '💀 Te quedaste sin vidas',
      text: '¿Quieres intentarlo de nuevo?',
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Salir',
      confirmButtonColor: '#d33',
      background: '#fff5f5'
    }).then(result => {
      if (result.isConfirmed) {
        this.loadLevel(0);
        this.router.navigate(['/junior/level-1']);
        this.gameStatus.setScore(0);
      } else {
        this.gameStatus.setScore(0);
        this.router.navigate(['/']);
      }
    });
  }

  nextLevel(): void {
    if (this.currentLevel < this.levels.length - 1) {
      this.loadLevel(this.currentLevel + 1);
    } else {
      this.handleGameCompleted();
    }
  }

  setScore(data: PartialData): void {
    this.gameData.setData(data).subscribe({
      next: res => console.log('✅ Datos enviados', res),
      error: err => console.error('❌ Error al enviar datos', err)
    });
  }

  toggleAudio(): void {
    if (this.audio.paused) {
      this.audio.play().catch(() => { });
      this.sonidoActivo = true;
    } else {
      this.audio.pause();
      this.sonidoActivo = false;
    }
  }

  showHint(): void {
    if (this.answered) return;

    const globalQuestionIndex =
      this.levels.slice(0, this.currentLevel).reduce((sum, lvl) => sum + lvl.questions.length, 0) +
      this.currentQuestion;

    const hintText = this.hints[globalQuestionIndex] || '💡 No hay pista disponible para esta pregunta.';

    Swal.fire({
      title: '💡 Pista',
      text: hintText,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6',
      background: '#f5faff'
    });
  }


  getOptionIcon(index: number): string {
    const icons = ['fa-microchip', 'fa-hdd', 'fa-plug'];
    return icons[index] || 'fa-circle';
  }
}
