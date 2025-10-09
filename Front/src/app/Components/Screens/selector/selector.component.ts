import { Component, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameStatusService } from '../../../Services/game-status.service';

@Component({
  selector: 'app-selector',
  imports: [RouterLink],
  templateUrl: './selector.component.html',
  styleUrl: './selector.component.css'
})
export class SelectorComponent implements AfterViewInit, OnDestroy {
  private observer!: IntersectionObserver;
  private audio = new Audio('/assets/Audios/SelecionadorEdad.mp3');

  constructor(private el: ElementRef, public gameStatus: GameStatusService) {}

  setDifficult(difficult: string) {
    this.gameStatus.setDifficult(difficult);
    console.log('la dificultad es: ' + difficult);
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
      this.audio.play().catch(err => {
        console.log('No se pudo reproducir:', err);
      });
    } else {
      this.audio.pause();
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.audio.pause();
  }
}
