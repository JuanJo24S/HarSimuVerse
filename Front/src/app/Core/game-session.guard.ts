import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { GameStatusService } from '../Services/game-status.service';

/**
 * Exige una partida valida (nickname + dificultad) para entrar a un nivel.
 *
 * Sin esto se podia abrir /kids/level-3 directamente por URL: el juego
 * arrancaba con nickname vacio y, al terminar, enviaba al backend
 * { nickname: "", difficult: "" }, que el servidor rechazaba con un 422 que
 * nadie veia. El jugador terminaba el nivel y su puntaje nunca se guardaba.
 */
export const gameSessionGuard: CanActivateFn = () => {
  const status = inject(GameStatusService);
  const router = inject(Router);

  if (status.hasActiveRun()) {
    return true;
  }

  // Sin nickname vuelve al registro; con nickname pero sin dificultad, al
  // selector, para no obligarlo a escribir el nombre otra vez.
  const target = status.nickname().trim().length >= 2 ? '/select-level' : '/home';

  return router.createUrlTree([target]);
};

/**
 * Protege la pantalla de resultados: sin dificultad no hay nada que mostrar
 * mas que una tabla vacia.
 */
export const scoreScreenGuard: CanActivateFn = () => {
  const status = inject(GameStatusService);
  const router = inject(Router);

  return status.hasActiveRun() ? true : router.createUrlTree(['/home']);
};
