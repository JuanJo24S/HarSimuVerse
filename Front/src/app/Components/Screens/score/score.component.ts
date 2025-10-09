import { CommonModule } from '@angular/common';
import { Data } from '../../../Models/data';
import { GameDataService } from '../../../Services/game-data.service';
import { GameStatusService } from './../../../Services/game-status.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-score',
  imports: [CommonModule],
  templateUrl: './score.component.html',
  styleUrl: './score.component.css'
})
export class ScoreComponent {

  scores: Data | null = null;

  constructor(private gameStatus: GameStatusService, private gameData: GameDataService) { }

  ngOnInit(): void {
    this.getScores();

  }

  get nickname() {
    return this.gameStatus.nickname();
  }

  get score() {
    return this.gameStatus.score();
  }

  get difficult() {
    return this.gameStatus.difficult();
  }


  getScores() {
    this.gameData.getScores().subscribe({
      next: (res) => {
        console.log('Datos obtenidos del servidor', res);
        this.scores = res;
      },
      error: (err) => {
        console.error('Error del servidor', err);
      }
    });
  }


}
