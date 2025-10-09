import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private hasStarted = false;

  constructor() {
    this.initAudio();
  }

  private initAudio(): void {
    this.audio = new Audio('/assets/Audios/MusicaFondo.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.3; // Volumen más bajo ayuda al autoplay

    // Intentar reproducir inmediatamente
    this.attemptAutoplay();

    // Backup: intentar en varios eventos del documento
    const events = ['click', 'touchstart', 'keydown', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, this.startAudioOnce, { once: true });
    });

    // Intentar cuando el documento esté listo
    if (document.readyState === 'complete') {
      this.attemptAutoplay();
    } else {
      window.addEventListener('load', () => this.attemptAutoplay());
    }

    // Intentar cuando la página sea visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.hasStarted) {
        this.attemptAutoplay();
      }
    });
  }

  private attemptAutoplay(): void {
    if (!this.hasStarted && this.audio) {
      this.audio.play()
        .then(() => {
          this.hasStarted = true;
          console.log('Audio reproducido automáticamente');
        })
        .catch(err => {
          console.warn('Autoplay bloqueado, esperando interacción del usuario:', err);
        });
    }
  }

  private startAudioOnce = (): void => {
    if (!this.hasStarted && this.audio) {
      this.hasStarted = true;
      this.audio.play().catch(err =>
        console.warn('Error al reproducir:', err)
      );
    }
  };

  play(): void {
    if (this.audio) {
      this.hasStarted = true;
      this.audio.play().catch(err =>
        console.warn('Error al reproducir:', err)
      );
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getVolume(): number {
    return this.audio?.volume || 0.3;
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }
}
