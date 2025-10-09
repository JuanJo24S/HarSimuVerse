import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameStatusService {

  lives = signal<number>(Number(sessionStorage.getItem('lives')) || 3);
  score = signal<number>(Number(sessionStorage.getItem('score')) || 0);
  nickname = signal<string>(sessionStorage.getItem('nickname') || '');
  difficult = signal<string>(sessionStorage.getItem('difficult') || '');

  setLives(value: number) {
    this.lives.set(value);
    sessionStorage.setItem('lives', value.toString());
  }

  loseLife() {
    this.lives.update(l => {
      const newValue = l > 0 ? l - 1 : 0;
      sessionStorage.setItem('lives', newValue.toString());
      return newValue;
    });
  }

  setDifficult(difficult: string) {
    this.difficult.set(difficult);
    sessionStorage.setItem('difficult', difficult);
  }

  gainLife() {
    this.lives.update(l => {
      const newValue = l + 1;
      sessionStorage.setItem('lives', newValue.toString());
      return newValue;
    });
  }

  // ---------- SCORE ----------
  setScore(value: number) {
    this.score.set(value);
    sessionStorage.setItem('score', value.toString());
  }

  addScore(points: number) {
    this.score.update(s => {
      const newValue = s + points;
      sessionStorage.setItem('score', newValue.toString());
      return newValue;
    });
  }

  resetScore() {
    this.score.set(0);
    sessionStorage.setItem('score', '0');
  }

  setNickname(name: string) {
    this.nickname.set(name);
    sessionStorage.setItem('nickname', name);
  }

  getNickname(): string {
    return this.nickname();
  }

  resetAll() {
    this.nickname.set('');
    this.score.set(0);
    this.difficult.set('');
    this.lives.set(3);
  }
}
