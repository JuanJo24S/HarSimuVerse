import { Component, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AudioService } from './Services/audio.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'HarSimuVerse';
  showSplash = true;

  constructor(private audioService: AudioService) {}

  ngOnInit(): void {
    // El audio se iniciará cuando se haga click en el splash
  }

  enterApp(): void {
    this.audioService.play();
    this.showSplash = false;
  }
}
