import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { GameStatusService } from '../../../../Services/game-status.service';
import { Router } from '@angular/router';
import { GameDataService } from '../../../../Services/game-data.service';
import { PartialData } from '../../../../Models/data';
import Swal from 'sweetalert2';

interface GamePart {
  type: string;
  emoji: string;
  visible: boolean;
}

interface DropZone {
  img: string | null;
  filled: boolean;
}

@Component({
  selector: 'app-computer-assembly',
  imports: [CommonModule],
  templateUrl: './computer-assembly.component.html',
  styleUrl: './computer-assembly.component.css'
})

export class ComputerAssemblyComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private el: ElementRef,
    public gameStatus: GameStatusService,
    private gameData: GameDataService,
    private router: Router
  ) {}

  private observer!: IntersectionObserver;
  private audio = new Audio('/assets/Audios/Juego1-3.mp3');

  timeLeft = 120;
  gameCompleted = false;
  correctMatches = 0;
  private timerInterval: any;
  localScore: number = 0;

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

  get difficult() {
    return this.gameStatus.difficult();
  }

  parts: GamePart[] = [
    { type: 'monitor', emoji: '/assets/img/Juego 3/Pantalla-juego3.png', visible: true },
    { type: 'keyboard', emoji: '/assets/img/Juego 3/Teclado-Juego3.png', visible: true },
    { type: 'mouse', emoji: '/assets/img/Juego 3/Mouse-Juego3.png', visible: true },
    { type: 'tower', emoji: '/assets/img/Juego 3/Torre-Juego3.png', visible: true }
  ];

  dropZones: { [key: string]: DropZone } = {
    monitor: { img: null, filled: false },
    keyboard: { img: null, filled: false },
    mouse: { img: null, filled: false },
    tower: { img: null, filled: false }
  };

  setScore(data: PartialData) {
    this.gameData.setData(data).subscribe({
      next: (res) => console.log('Respuesta del servidor', res),
      error: (err) => {
        console.error('Error en la petición', err);
        console.log('Json enviado: ', data);
      }
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) this.audio.play();
          else this.audio.pause();
        });
      },
      { threshold: 0.5 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  toggleAudio() {
    if (this.audio.paused) this.audio.play().catch(err => console.log('No se pudo reproducir:', err));
    else this.audio.pause();
  }

  ngOnInit(): void {
    this.startGame();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.observer) this.observer.disconnect();
    this.audio.pause();
  }

  private startGame(): void {
    this.resetGame();
    this.startTimer();
    this.audio.load();
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        this.handleTimeOver();
      }
    }, 1000);
  }

  private async handleTimeOver(): Promise<void> {
    clearInterval(this.timerInterval);

    if (!this.gameCompleted) {
      this.gameStatus.loseLife();

      if (this.lives > 0) {
        await Swal.fire({
          icon: 'warning',
          title: '⏰ ¡Se acabó el tiempo!',
          text: 'Pierdes una vida, inténtalo de nuevo.',
          confirmButtonText: 'Continuar',
          confirmButtonColor: '#3085d6'
        });
        this.resetRound();
        this.startTimer();
      } else {
        await Swal.fire({
          icon: 'error',
          title: '💔 ¡Perdiste todas tus vidas!',
          text: 'Reiniciando el juego...',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d33'
        });
        this.router.navigate(['/kids/level-1']);
        this.startGame();
      }
    }
  }

  private resetGame(): void {
    this.timeLeft = 120;
    this.localScore = 0;
    this.correctMatches = 0;
    this.gameCompleted = false;
    this.resetPartsAndZones();
  }

  private resetRound(): void {
    this.timeLeft = 120;
    this.correctMatches = 0;
    this.gameCompleted = false;
    this.resetPartsAndZones();
  }

  private resetPartsAndZones(): void {
    this.parts.forEach(p => p.visible = true);
    this.dropZones = {
      monitor: { img: null, filled: false },
      keyboard: { img: null, filled: false },
      mouse: { img: null, filled: false },
      tower: { img: null, filled: false }
    };
  }


  onDragStart(event: DragEvent, partType: string): void {
    if (event.dataTransfer) event.dataTransfer.setData('text/plain', partType);
    setTimeout(() => (event.target as HTMLElement).classList.add('dragging'), 0);
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('dragging');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.target as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent, zoneType: string): void {
    event.preventDefault();
    const element = event.target as HTMLElement;
    element.classList.remove('drag-over');

    const partType = event.dataTransfer?.getData('text/plain') || '';

    if (partType === zoneType && !this.dropZones[zoneType].filled) {
      this.handleCorrectDrop(partType, zoneType, element);
    } else {
      this.handleIncorrectDrop(element);
    }
  }

  private async handleCorrectDrop(partType: string, zoneType: string, element: HTMLElement): Promise<void> {
    this.dropZones[zoneType].filled = true;
    this.dropZones[zoneType].img = this.parts.find(p => p.type === partType)?.emoji || null;
    element.classList.add('correct');

    const part = this.parts.find(p => p.type === partType);
    if (part) part.visible = false;

    this.correctMatches++;
    this.localScore += 15;

    if (this.correctMatches === this.parts.length) {
      this.gameStatus.addScore(this.localScore);
      clearInterval(this.timerInterval);
      setTimeout(() => this.gameCompleted = true, 500);
      this.localScore = 0;

      await Swal.fire({
        icon: 'success',
        title: '🎉 ¡Excelente!',
        text: 'Completaste el computador de Juancho correctamente.',
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#28a745'
      });

      const payload: PartialData = {
        difficult: this.difficult,
        nickname: this.nickname,
        score: this.score
      };
      this.setScore(payload);
      this.router.navigate(['/score']);
    }
  }

  private async handleIncorrectDrop(element: HTMLElement): Promise<void> {
    element.classList.add('incorrect');
    setTimeout(() => element.classList.remove('incorrect'), 800);

    this.gameStatus.loseLife();

    if (this.lives <= 0) {
      clearInterval(this.timerInterval);
      await Swal.fire({
        icon: 'error',
        title: '💔 ¡Perdiste todas tus vidas!',
        text: 'Reiniciando el nivel...',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d33'
      });
      this.router.navigate(['/kids/level-1']);
    } else {
      await Swal.fire({
        icon: 'warning',
        title: '⚠️ Error',
        text: 'Esa pieza no va ahí. ¡Intenta de nuevo!',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f0ad4e'
      });
    }
  }
}
