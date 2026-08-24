import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Body, Data } from '../../../Models/data';
import { AudioService } from '../../../Services/audio.service';
import { GameDataService } from '../../../Services/game-data.service';
import { GameStatusService } from '../../../Services/game-status.service';

@Component({
  selector: 'app-score',
  imports: [TitleCasePipe],
  templateUrl: './score.component.html',
  styleUrl: './score.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreComponent implements OnInit {
  private readonly gameStatus = inject(GameStatusService);
  private readonly gameData = inject(GameDataService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);

  readonly scores = signal<Data>({ kids: [], junior: [] });

  /**
   * Las dos tablas del ranking. Antes el bloque de tabla estaba duplicado
   * palabra por palabra en la plantilla, una vez para kids y otra para junior,
   * con solo el color y el titulo cambiados.
   */
  readonly boards = [
    { key: 'kids' as const, label: 'Kids', icon: '👶', accent: 'text-pink-400' },
    { key: 'junior' as const, label: 'Junior', icon: '🧠', accent: 'text-sky-400' },
  ];

  readonly topLimit = 5;

  readonly nickname = computed(() => this.gameStatus.nickname());
  readonly score = computed(() => this.gameStatus.score());
  readonly difficult = computed(() => this.gameStatus.difficult());
  readonly saved = computed(() => this.gameStatus.submitted());

  /**
   * El puesto conseguido vive en el servicio de estado, no en un signal local.
   *
   * Al refrescar esta pantalla el puntaje no se vuelve a guardar (ya esta el
   * flag `submitted`), asi que un signal local se quedaria en null y la
   * plantilla diria "no alcanzo para el top" aunque el jugador fuera primero.
   */
  readonly position = this.gameStatus.position;

  ngOnInit(): void {
    this.audio.playDefault();

    /*
      Guardar antes de leer, para que el ranking que se pinta ya incluya el
      puntaje de esta partida.

      El flag `submitted` evita que refrescar la pantalla, o volver con el boton
      atras del navegador, registre la misma partida dos veces.
    */
    if (!this.gameStatus.submitted() && this.gameStatus.hasActiveRun()) {
      const result = this.gameData.saveScore({
        difficult: this.difficult(),
        nickname: this.nickname(),
        score: this.score(),
      });

      if (result !== null) {
        this.gameStatus.setSubmitted(true);
        this.gameStatus.setPosition(result.ranking.position);
      }
    }

    this.scores.set(this.gameData.getScores());
  }

  rowsFor(key: 'kids' | 'junior'): Body[] {
    return this.scores()[key];
  }

  /**
   * La fila del jugador actual, para resaltarla.
   *
   * Compara tambien la dificultad: sin eso, un jugador llamado igual en la otra
   * tabla salia marcado como si fuera el.
   */
  isMe(item: Body, key: 'kids' | 'junior'): boolean {
    return item.nickname === this.nickname() && this.difficult() === key;
  }

  /** Vuelve a jugar la misma dificultad desde el nivel 1. */
  playAgain(): void {
    const difficulty = this.difficult();
    this.gameStatus.restartRun();
    void this.router.navigate([`/${difficulty}`, 'level-1']);
  }

  /** Empieza de cero: nuevo jugador. */
  goHome(): void {
    this.gameStatus.resetAll();
    void this.router.navigate(['/home']);
  }
}
