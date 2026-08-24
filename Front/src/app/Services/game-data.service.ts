import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import { Data, PartialData, StoreScoreResponse } from '../Models/data';

/** Cuanto se espera al backend antes de rendirse. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Cliente de la API de puntajes.
 */
@Injectable({ providedIn: 'root' })
export class GameDataService {
  private readonly http = inject(HttpClient);

  /**
   * Antes este archivo importaba `environment.development` de forma explicita.
   * Como angular.json solo sustituye environment.ts por su version de
   * desarrollo (fileReplacements), el import directo se saltaba la
   * sustitucion: el build de produccion quedaba apuntando a
   * http://127.0.0.1:8000/api y en Vercel no encontraba la API.
   */
  private readonly url = `${environment.apiUrl}/score`;

  getScores(): Observable<Data> {
    return this.http.get<Data>(this.url).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(error => this.fail(error, 'No se pudo cargar el ranking.'))
    );
  }

  setData(data: PartialData): Observable<StoreScoreResponse> {
    return this.http.post<StoreScoreResponse>(this.url, data).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError(error => this.fail(error, 'No se pudo guardar el puntaje.'))
    );
  }

  /**
   * Traduce el error HTTP a un mensaje que se le puede mostrar al jugador.
   * Antes cada componente hacia su propio console.error y el usuario no veia
   * nada cuando el backend estaba caido.
   */
  private fail(error: unknown, fallback: string): Observable<never> {
    let message = fallback;

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        message = 'No hay conexion con el servidor del juego.';
      } else if (error.status === 422) {
        message = 'Los datos de la partida no son validos.';
      } else if (error.status === 429) {
        message = 'Demasiados intentos seguidos. Espera un momento.';
      } else if (error.status >= 500) {
        message = 'El servidor del juego tuvo un problema.';
      }
    }

    return throwError(() => new Error(message));
  }
}
