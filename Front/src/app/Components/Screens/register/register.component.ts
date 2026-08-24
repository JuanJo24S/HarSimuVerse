import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AudioService } from '../../../Services/audio.service';
import { GameStatusService } from '../../../Services/game-status.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);

  /** Se precarga el nickname anterior para no obligar a reescribirlo. */
  nickname = this.gameStatus.nickname();

  readonly submitting = signal(false);

  /**
   * Antes recibia el objeto del formulario y hacia console.log del nickname
   * y de "Formulario inválido" en cada envio. El boton ya esta deshabilitado
   * cuando el formulario es invalido, asi que la comprobacion se hace aqui
   * sobre el valor real.
   */
  onSubmit(): void {
    const clean = this.nickname.trim();

    if (clean.length < 2 || this.submitting()) {
      return;
    }

    this.submitting.set(true);

    // Empezar de cero: si el jugador vuelve al inicio tras una partida, el
    // puntaje y las vidas anteriores no deben arrastrarse.
    this.gameStatus.resetAll();
    this.gameStatus.setNickname(clean);

    // Cualquier interaccion sirve como gesto para habilitar el audio: si el
    // jugador llego aqui por URL directa, sin pasar por el splash, la musica
    // arranca igual.
    this.audio.unlock();

    void this.router.navigate(['/select-level']);
  }
}
