import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AudioService } from './Services/audio.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'HarSimuVerse';

  /** El splash tapa la app hasta el primer click, que es el gesto que el
   *  navegador exige para permitir el audio. */
  readonly showSplash = signal(true);

  private readonly audio = inject(AudioService);

  /**
   * Antes esta clase declaraba ngOnInit sin implementar OnInit y con un cuerpo
   * vacio, e importaba AfterViewInit, OnDestroy y ElementRef sin usarlos.
   */
  enterApp(): void {
    this.audio.unlock();
    this.showSplash.set(false);
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  get muted(): boolean {
    return this.audio.muted();
  }
}
