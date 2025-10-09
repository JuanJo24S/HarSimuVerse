import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { GameStatusService } from '../../../../Services/game-status.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface Pregunta {
  titulo: string;
  imagen: string;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: string;
}

@Component({
  selector: 'app-game3',
  imports: [CommonModule],
  templateUrl: './game3.component.html',
  styleUrl: './game3.component.css'
})
export class Game3Component implements OnInit, AfterViewInit, OnDestroy {
  preguntas: Pregunta[] = [
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

  preguntaActual: number = 0;
  respuestas: { [key: number]: string } = {};
  juegoTerminado: boolean = false;
  localScore: number = 0;

  tiempoRestante: number = 120;
  intervalo: any;

  get lives() {
    return this.gameStatus.lives();
  }
  get nickname() {
    return this.gameStatus.nickname();
  }
  get score() {
    return this.gameStatus.score();
  }
  get livesArray() {
    return Array(this.lives).fill(0);
  }

  private observer!: IntersectionObserver;
  private audio = new Audio('/assets/Audios/Nivel 2-2.mp3');
  sonidoActivo: boolean = true;

  constructor(
    private el: ElementRef,
    public gameStatus: GameStatusService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.audio.load();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.audio.play().catch(() => { });
          } else {
            this.audio.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    this.observer.observe(this.el.nativeElement);

    this.iniciarTemporizador();
  }

  toggleAudio() {
    if (this.audio.paused) {
      this.audio.play().catch(() => { });
      this.sonidoActivo = true;
    } else {
      this.audio.pause();
      this.sonidoActivo = false;
    }
  }

  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
    this.audio.pause();
    clearInterval(this.intervalo);
  }

  get preguntaActualData(): Pregunta {
    return this.preguntas[this.preguntaActual];
  }
  get esUltimaPregunta(): boolean {
    return this.preguntaActual === this.preguntas.length - 1;
  }
  get esPrimeraPregunta(): boolean {
    return this.preguntaActual === 0;
  }
  get todasLasPreguntasRespondidas(): boolean {
    return Object.keys(this.respuestas).length === this.preguntas.length;
  }
  get preguntaActualRespondida(): boolean {
    return !!this.respuestas[this.preguntaActual];
  }

  seleccionarRespuesta(opcion: string): void {
    if (this.respuestas[this.preguntaActual] || this.juegoTerminado || this.lives <= 0) return;

    this.respuestas[this.preguntaActual] = opcion;

    if (opcion === this.preguntaActualData.respuestaCorrecta) {
      this.localScore++;

      Swal.fire({
        icon: 'success',
        title: '¡Correcto!',
        text: 'Has acertado la respuesta 🎉',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      this.gameStatus.loseLife();

      Swal.fire({
        icon: 'error',
        title: 'Respuesta incorrecta',
        text: 'Has perdido una vida 💔',
        timer: 1500,
        showConfirmButton: false
      });

      if (this.lives === 0) {
        this.finalizarJuego();
      }
    }
  }

  esOpcionSeleccionada(opcion: string): boolean {
    return this.respuestas[this.preguntaActual] === opcion;
  }

  preguntaAnterior(): void {
    if (this.preguntaActual > 0) this.preguntaActual--;
  }

  preguntaSiguiente(): void {
    if (this.preguntaActual < this.preguntas.length - 1) this.preguntaActual++;
  }

  contarRespuestasCorrectas(): number {
    return this.localScore;
  }

  finalizarJuego(): void {
    this.juegoTerminado = true;
    clearInterval(this.intervalo);
    this.audio.pause();

    Swal.fire({
      title: 'Juego terminado 🎯',
      text: `Tu puntuación fue ${this.localScore} puntos.`,
      icon: 'info',
      confirmButtonText: 'Ver resultados'
    });
  }

  reiniciarJuego(): void {
    this.preguntaActual = 0;
    this.respuestas = {};
    this.juegoTerminado = false;
    this.localScore = 0;
    this.tiempoRestante = 120;
    clearInterval(this.intervalo);
    this.iniciarTemporizador();

    if (!this.sonidoActivo) this.audio.pause();
  }

  nextLevel(): void {
    this.gameStatus.addScore(this.localScore);

    Swal.fire({
      title: '¡Nivel completado!',
      text: `Tu puntaje total es ${this.score + this.localScore}`,
      icon: 'success',
      confirmButtonText: 'Continuar'
    }).then(() => {
      this.router.navigate(['/junior/level-3']);
    });
  }

  iniciarTemporizador(): void {
    clearInterval(this.intervalo);
    this.intervalo = setInterval(() => {
      if (this.juegoTerminado) {
        clearInterval(this.intervalo);
        return;
      }

      if (this.tiempoRestante > 0) {
        this.tiempoRestante--;
      } else {
        this.gameStatus.loseLife();

        Swal.fire({
          icon: 'warning',
          title: '⏳ Tiempo agotado',
          text: 'Has perdido una vida.',
          timer: 1500,
          showConfirmButton: false
        });

        if (this.lives === 0) {
          this.finalizarJuego();
        } else {
          this.tiempoRestante = 120;
        }
      }
    }, 1000);
  }

  esRespuestaCorrecta(index: number): boolean {
    return this.respuestas[index] === this.preguntas[index].respuestaCorrecta;
  }
}
