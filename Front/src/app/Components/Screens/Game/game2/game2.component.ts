import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { GameStatusService } from '../../../../Services/game-status.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface DraggableItem {
  name: string;
  src: string;
  alt: string;
  visible: boolean;
}

interface DroppableArea {
  name: string;
  label: string;
  alt: string;
  filled: boolean;
  imageSrc: string;
}

@Component({
  selector: 'app-game2',
  imports: [FormsModule, CommonModule],
  templateUrl: './game2.component.html',
  styleUrl: './game2.component.css'
})
export class Game2Component implements OnInit, AfterViewInit, OnDestroy {
  // 🎮 Estado del juego
  tiempoRestante: number = 120;
  temporizador: any;
  localScore: number = 0;
  juegoActivo: boolean = false;
  draggedItem: string = '';

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

  // 🎵 Audio
  private audio = new Audio('/assets/Audios/Nivel 2-1.mp3');
  private observer!: IntersectionObserver;

  draggableItems: DraggableItem[] = [
    { name: 'fuente', src: '/assets/img/Juego 4/fuente_poder-Juego4.png', alt: 'Fuente', visible: true },
    { name: 'ram', src: '/assets/img/Juego 4/ram-Juego4.png', alt: 'RAM', visible: true },
    { name: 'procesador', src: '/assets/img/Juego 4/procesador-Juego4.png', alt: 'GPU', visible: true },
    { name: 'cpu', src: '/assets/img/Juego 4/CPU-Juego4.png', alt: 'CPU', visible: true },
    { name: 'tarjetar', src: '/assets/img/Juego 4/tarjeta-red-Juego4.png', alt: 'tarjetar', visible: true },
    { name: 'disipador', src: '/assets/img/Juego 4/disipador-Juego4.png', alt: 'disipador', visible: true },
    { name: 'disco', src: '/assets/img/Juego 4/discoDuro-Juego4.png', alt: 'disco', visible: true },
    { name: 'lector', src: '/assets/img/Juego 4/lector_cd-Juego4.png', alt: 'Lector', visible: true }
  ];

  droppableAreas: DroppableArea[] = [
    { name: 'tarjetar', label: 'Tarjeta de Red', alt: 'tarjetar', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'lector', label: 'Lector', alt: 'lector', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'disipador', label: 'Disipador', alt: 'Disipador', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'cpu', label: 'Gabinete', alt: 'CPU', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'disco', label: 'Disco Duro', alt: 'Disco', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'fuente', label: 'Fuente poder', alt: 'fuente', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'ram', label: 'RAM', alt: 'RAM', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' },
    { name: 'procesador', label: 'CPU', alt: 'PROCESADOR', filled: false, imageSrc: '/placeholder.svg?height=100&width=100' }
  ];

  constructor(private el: ElementRef, public gameStatus: GameStatusService, private router: Router) {}

  ngOnInit() {
    this.iniciarJuego();
    this.audio.load();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.audio.play().catch(err => console.log('No se pudo reproducir:', err));
          } else {
            this.audio.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.observer) this.observer.disconnect();
    this.audio.pause();
  }

  toggleAudio() {
    if (this.audio.paused) {
      this.audio.play().catch(err => console.log("Error audio:", err));
    } else {
      this.audio.pause();
    }
  }

  iniciarJuego() {
    this.localScore = 0;
    this.resetearJuego();
    this.iniciarTemporizador();
    this.juegoActivo = true;
  }

  private resetearRonda() {
    this.tiempoRestante = 120;
    this.draggableItems.forEach(item => item.visible = true);
    this.droppableAreas.forEach(area => {
      area.filled = false;
      area.imageSrc = '/placeholder.svg?height=100&width=100';
    });
    this.iniciarTemporizador();
  }

  resetearJuego() {
    this.resetearRonda();
    this.localScore = 0;
    this.gameStatus.setLives(3);
  }

  iniciarTemporizador() {
    if (this.temporizador) clearInterval(this.temporizador);
    this.tiempoRestante = 120;

    this.temporizador = setInterval(() => {
      this.tiempoRestante--;
      if (this.tiempoRestante <= 0) {
        clearInterval(this.temporizador);
        this.gameStatus.loseLife();

        if (this.lives > 0) {
          Swal.fire({
            icon: 'warning',
            title: '⏳ ¡Tiempo agotado!',
            text: 'Pierdes una vida 😢',
            confirmButtonText: 'Continuar'
          }).then(() => this.resetearRonda());
        } else {
          Swal.fire({
            icon: 'error',
            title: '❌ Sin vidas',
            text: 'Reiniciando juego...',
            confirmButtonText: 'Reintentar'
          }).then(() => this.iniciarJuego());
        }
      }
    }, 1000);
  }

  finalizarJuego() {
    clearInterval(this.temporizador);
    this.juegoActivo = false;

    Swal.fire({
      icon: 'success',
      title: '🎉 ¡Juego completado!',
      text: `Has ganado ${this.localScore} puntos`,
      confirmButtonText: 'Continuar'
    }).then(() => {
      this.gameStatus.addScore(this.localScore);
      this.router.navigate(['/junior/level-2']);
    });
  }

  onDragStart(event: DragEvent, itemName: string) {
    if (!this.juegoActivo) return;
    this.draggedItem = itemName;
    if (event.dataTransfer) event.dataTransfer.setData('text/plain', itemName);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement)?.classList.add('hovered');
  }

  onDragLeave(event: DragEvent) {
    (event.currentTarget as HTMLElement)?.classList.remove('hovered');
  }

  onDrop(event: DragEvent, targetName: string) {
    if (!this.juegoActivo) return;
    event.preventDefault();

    const target = event.currentTarget as HTMLElement;
    target?.classList.remove('hovered');

    if (this.draggedItem === targetName) {
      const droppableArea = this.droppableAreas.find(a => a.name === targetName);
      const draggableItem = this.draggableItems.find(i => i.name === this.draggedItem);

      if (droppableArea && draggableItem) {
        droppableArea.filled = true;
        droppableArea.imageSrc = draggableItem.src;
        draggableItem.visible = false;

        this.localScore += 15;
        this.checkCompletion();
      }
    } else {
      this.gameStatus.loseLife();
      if (this.lives <= 0) {
        Swal.fire({
          icon: 'error',
          title: '💀 Sin vidas',
          text: 'Reiniciando juego...',
          confirmButtonText: 'Reintentar'
        }).then(() => this.iniciarJuego());
      } else {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Pieza incorrecta',
          text: 'Pierdes una vida 😣',
          confirmButtonText: 'Continuar'
        }).then(() => this.resetearRonda());
      }
    }

    this.draggedItem = '';
  }

  checkCompletion() {
    const allPlaced = this.draggableItems.every(item => !item.visible);
    if (allPlaced) {
      this.finalizarJuego();
    }
  }
}
