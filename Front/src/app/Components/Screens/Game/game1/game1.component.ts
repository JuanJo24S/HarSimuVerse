import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStatusService } from '../../../../Services/game-status.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface Tarjeta {
  id: number;
  img: string;
  volteada: boolean;
  encontrada: boolean;
  indice: number;
}

@Component({
  selector: 'app-game1',
  imports: [FormsModule, CommonModule],
  templateUrl: './game1.component.html',
  styleUrl: './game1.component.css'
})
export class Game1Component implements OnInit, AfterViewInit, OnDestroy {

  constructor(private el: ElementRef, public gameStatus: GameStatusService, private router: Router) { }

  private observer!: IntersectionObserver;
  private audio = new Audio('/assets/Audios/Juego1-2.mp3');

  iconos: any[] = [];
  tarjetas: Tarjeta[] = [];
  selecciones: number[] = [];
  tiempoRestante: number = 120;
  temporizador: any;
  juegoIniciado: boolean = false;
  localScore: number = 0;
  aciertos: number = 0;

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

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.audio.play();
          } else {
            this.audio.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  toggleAudio() {
    if (this.audio.paused) {
      this.audio.play().catch(err => console.log('No se pudo reproducir:', err));
    } else {
      this.audio.pause();
    }
  }

  ngOnInit() {
    this.cargarIconos();
    this.audio.load();
    this.generarTablero();
  }

  ngOnDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.observer) this.observer.disconnect();
    this.audio.pause();
  }

  cargarIconos() {
    this.iconos = [
      { id: 1, img: '<img src="https://i.ibb.co/CnckPMX/img2.png" width="64%">' },
      { id: 2, img: '<img src="https://i.ibb.co/WxSzVy2/img1.png" width="64%">' },
      { id: 3, img: '<img src="https://i.ibb.co/pQ69sDC/img3.png" width="64%">' },
      { id: 4, img: '<img src="https://i.ibb.co/TthxBPf/impresora-removebg-preview.png" width="70%">' },
      { id: 5, img: '<img src="https://i.ibb.co/ZTp5Zrg/img6.png" width="64%">' },
      { id: 6, img: '<img src="https://i.ibb.co/7rFVYm4/img7.png" width="64%">' },
      { id: 7, img: '<img src="https://i.ibb.co/55v677r/img10.png" width="70%">' },
      { id: 8, img: '<img src="https://i.ibb.co/481fDmz/img12.png" width="70%">' },
      { id: 9, img: '<img src="https://i.ibb.co/0j5fHCw/pantalla.png" width="70%">' },
      { id: 10, img: '<img src="https://i.ibb.co/PZqBLYr/img11.png" width="70%">' },
      { id: 11, img: '<img src="https://i.ibb.co/vZ0j6JK/img15.png" width="70%">' },
      { id: 12, img: '<img src="https://i.ibb.co/qsVVtHB/img17.png" width="70%">' }
    ];
  }

  iniciarTemporizador() {
    this.tiempoRestante = 120;
    this.temporizador = setInterval(() => {
      if (this.tiempoRestante > 0) {
        this.tiempoRestante--;
      } else {
        clearInterval(this.temporizador);
        this.perderVida();
      }
    }, 1000);
  }

  async perderVida() {
    this.gameStatus.loseLife();

    if (this.lives > 0) {
      await Swal.fire({
        icon: 'warning',
        title: '¡Perdiste una vida!',
        text: `Te quedan ${this.lives} ❤️`,
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#3085d6'
      });

      this.localScore = 0;
      this.iniciarTemporizador();
    } else {
      this.finalizarJuego();
    }
  }

  async finalizarJuego() {
    await Swal.fire({
      icon: 'error',
      title: '¡Se acabó el tiempo!',
      text: 'Intenta nuevamente 😢',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#d33'
    });

    clearInterval(this.temporizador);
    this.juegoIniciado = false;

    if (this.lives <= 0) {
        clearInterval(this.temporizador);
        await Swal.fire({
          icon: 'error',
          title: 'Juego terminado 😢',
          text: 'Te quedaste sin vidas',
          confirmButtonColor: '#d33'
        });
        this.juegoIniciado = false;
        this.router.navigate(['/kids/level-1']);
      }
  }

  generarTablero() {
    this.cargarIconos();
    this.selecciones = [];
    this.juegoIniciado = true;

    let iconosDuplicados = [...this.iconos, ...this.iconos];
    iconosDuplicados.sort(() => Math.random() - 0.5);

    this.tarjetas = iconosDuplicados.map((icono, index) => ({
      id: icono.id,
      img: icono.img,
      volteada: false,
      encontrada: false,
      indice: index
    }));

    this.iniciarTemporizador();
  }

  seleccionarTarjeta(indice: number) {
    const tarjeta = this.tarjetas[indice];

    if (tarjeta.volteada || tarjeta.encontrada || this.selecciones.length >= 2) return;

    tarjeta.volteada = true;
    this.selecciones.push(indice);

    if (this.selecciones.length === 2) {
      setTimeout(() => this.evaluarSeleccion(), 800);
    }
  }

  async evaluarSeleccion() {
    if (this.selecciones.length !== 2) return;

    const [indice1, indice2] = this.selecciones;
    const tarjeta1 = this.tarjetas[indice1];
    const tarjeta2 = this.tarjetas[indice2];

    if (tarjeta1.id === tarjeta2.id) {
      tarjeta1.encontrada = true;
      tarjeta2.encontrada = true;
      this.localScore += 1;
      this.aciertos += 1;

      if (this.aciertos === this.iconos.length) {
        clearInterval(this.temporizador);

        await Swal.fire({
          icon: 'success',
          title: '¡Felicitaciones! 🎉',
          text: `Completaste el juego con ${this.localScore} puntos`,
          confirmButtonText: 'Siguiente nivel',
          confirmButtonColor: '#28a745'
        });

        this.gameStatus.addScore(this.localScore);
        this.router.navigate(['/kids/level-3']);
      }
    } else {
      tarjeta1.volteada = false;
      tarjeta2.volteada = false;

      if (this.lives <= 0) {
        clearInterval(this.temporizador);
        await Swal.fire({
          icon: 'error',
          title: 'Juego terminado 😢',
          text: 'Te quedaste sin vidas',
          confirmButtonColor: '#d33'
        });
        this.juegoIniciado = false;
        this.router.navigate(['/'])
      }
    }

    this.selecciones = [];
  }
}
