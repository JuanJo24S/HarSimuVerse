import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AudioService } from '../../../Services/audio.service';
import { Difficulty, GameStatusService } from '../../../Services/game-status.service';

@Component({
  selector: 'app-selector',
  imports: [TitleCasePipe],
  templateUrl: './selector.component.html',
  styleUrl: './selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly gameStatus = inject(GameStatusService);

  ngOnInit(): void {
    /*
      Antes esta pantalla montaba un IntersectionObserver sobre su propio
      elemento raiz para arrancar el audio "cuando fuera visible". Como el
      componente ocupa toda la pantalla, el observer se disparaba una unica vez
      justo al montarse: era un `play()` con pasos extra. Y el `play()` dentro
      del callback no tenia catch, asi que dejaba una promesa rechazada sin
      manejar cuando el navegador bloqueaba el autoplay.
    */
    this.audio.playTrack('/assets/Audios/SelecionadorEdad.mp3', {
      destroyRef: this.destroyRef,
    });
  }

  /**
   * Fija la dificultad y entra al primer nivel.
   *
   * Antes la plantilla combinaba [routerLink] con (click)="setDifficult(...)"
   * en el mismo div. Los dos son listeners de click sobre el mismo elemento y
   * el orden de ejecucion no esta garantizado: si RouterLink navegaba primero,
   * el guard veia la dificultad todavia vacia. Navegar a mano elimina la
   * carrera.
   */
  start(difficulty: Difficulty): void {
    this.gameStatus.startRun(this.gameStatus.nickname(), difficulty);
    void this.router.navigate([`/${difficulty}`, 'level-1']);
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  get muted(): boolean {
    return this.audio.muted();
  }
}
