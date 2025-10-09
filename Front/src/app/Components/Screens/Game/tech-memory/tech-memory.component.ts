import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { GameStatusService } from '../../../../Services/game-status.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';


interface GameItem {
  id: string;
  name: string;
  iconClass: string;
  matched: boolean;
  src: string;
}

@Component({
  selector: 'app-tech-memory',
  imports: [CommonModule],
  templateUrl: './tech-memory.component.html',
  styleUrl: './tech-memory.component.css'
})

export class TechMemoryComponent implements OnInit, AfterViewInit, OnDestroy {

 tiempo: number = 120;
  intervalId: any;
  localScore: number = 0;

  get score() {
    return this.gameStatus.score();
  }

  get lives() {
    return this.gameStatus.lives();
  }

  get nickname() {
    return this.gameStatus.nickname();
  }

  get livesArray() {
    return Array(this.lives).fill(0);
  }

  private observer!: IntersectionObserver;
  private audio = new Audio('/assets/Audios/Juego1-1.mp3');

  gameItems: GameItem[] = [
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
    { id: 'carpeta', name: 'Carpeta', iconClass: 'carpeta-icon', matched: false, src: '/assets/img/Juego 1/Carpeta-Explorador de archivos-Juego1.png' }
  ];

  shuffledNames: string[] = [];

  constructor(
    private el: ElementRef,
    public gameStatus: GameStatusService,
    private router: Router
  ) {
    this.startGame();
  }

  ngOnInit(): void {
    this.audio.load();
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
    if (this.audio.paused) {
      this.audio.play().catch(err => console.log('No se pudo reproducir:', err));
    } else {
      this.audio.pause();
    }
  }

  startGame() {
    this.gameStatus.setLives(3);
    this.gameStatus.setScore(0);
    this.tiempo = 120;
    this.shuffledNames = this.shuffleArray([...this.gameItems.map(item => item.name)]);
    this.startTimer();
    this.gameItems.forEach(item => item.matched = false);
  }

  shuffleArray(array: string[]): string[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  startTimer() {
    this.stopTimer();
    this.intervalId = setInterval(() => {
      this.tiempo--;
      if (this.tiempo <= 0) {
        this.stopTimer();
        this.handleTimeOver();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async handleTimeOver() {
    this.gameStatus.loseLife();

    if (this.lives > 0) {
      await Swal.fire({
        icon: 'warning',
        title: '⏰ ¡Se acabó el tiempo!',
        text: `Perdiste una vida. Te quedan ${this.lives} ${this.lives === 1 ? 'vida' : 'vidas'}.`,
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#3085d6'
      });
      this.resetGame();
    } else {
      await Swal.fire({
        icon: 'error',
        title: '💀 ¡Sin vidas!',
        text: 'Has perdido todas tus vidas.',
        confirmButtonText: 'Reintentar',
        showCancelButton: true,
        cancelButtonText: 'Salir',
        confirmButtonColor: '#d33'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/kids/level-1'])
          this.gameStatus.setScore(0);
          this.startGame();
        } else {
          this.router.navigate(['/']);
        }
      });
    }
  }

  onDragStart(event: DragEvent, name: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', name);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  async onDrop(event: DragEvent, targetItem: GameItem) {
    event.preventDefault();
    const draggedName = event.dataTransfer!.getData('text/plain');

    if (draggedName.toLowerCase() === targetItem.name.toLowerCase() && !targetItem.matched) {
      targetItem.matched = true;
      const puntos = Math.max(5, Math.floor(100 / (this.tiempo + 1)));
      this.localScore += puntos;

      const index = this.shuffledNames.indexOf(draggedName);
      if (index > -1) this.shuffledNames.splice(index, 1);

      if (this.shuffledNames.length === 0) {
        this.gameStatus.addScore(this.score + this.localScore);
        this.stopTimer();
        await Swal.fire({
          icon: 'success',
          title: '🎉 ¡Felicidades!',
          html: `Completaste el juego en <b>${this.tiempo}</b> segundos con <b>${this.localScore}</b> puntos.`,
          confirmButtonText: 'Continuar',
          confirmButtonColor: '#28a745'
        });
        this.router.navigate(['/kids/level-2']);
      }
    } else {
      this.gameStatus.loseLife();

      if (this.lives <= 0) {
        this.stopTimer();
        await Swal.fire({
          icon: 'error',
          title: '💔 ¡Juego terminado!',
          text: 'Has perdido todas tus vidas.',
          confirmButtonText: 'Reiniciar',
          confirmButtonColor: '#d33'
        });
        this.resetGame();
      } else {
        await Swal.fire({
          icon: 'warning',
          title: '⚠️ Incorrecto',
          text: `Esa no es la pareja correcta. Te quedan ${this.lives} vidas.`,
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: '#f0ad4e'
        });
      }
    }
  }

  resetGame() {
    this.stopTimer();
    this.localScore = 0;
    this.tiempo = 120;
    this.shuffledNames = this.shuffleArray([...this.gameItems.map(item => item.name)]);
    this.startTimer();
    this.gameItems.forEach(item => item.matched = false);
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.observer) this.observer.disconnect();
    this.audio.pause();
  }
}
