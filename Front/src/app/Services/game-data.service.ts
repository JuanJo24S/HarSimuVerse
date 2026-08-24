import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Body, Data, PartialData, StoreScoreResponse } from '../Models/data';

/** Clave del almacen. Con prefijo para no chocar con otras apps del dominio. */
const STORAGE_KEY = 'harsimuverse:scores';

/** Cuantos puntajes se conservan por dificultad. */
const TOP_LIMIT = 5;

/** Cota superior, heredada de la validacion que hacia el backend. */
const MAX_SCORE = 100_000;

/**
 * Ranking de puntajes, guardado en el navegador.
 *
 * Antes esto hablaba con una API en Laravel respaldada por Postgres. El proyecto
 * dejo de usar backend, asi que los puntajes viven en localStorage.
 *
 * Lo que eso implica, y conviene tener presente: el ranking es POR NAVEGADOR.
 * Cada tablet ve solo sus propios puntajes, no los de los demas, y se pierden si
 * se limpian los datos del sitio o se juega en modo privado. Deja de ser una
 * tabla de clasificacion entre jugadores y pasa a ser un historial local.
 *
 * Se mantiene la interfaz de Observables que tenia la version HTTP para que las
 * pantallas no tengan que distinguir de donde salen los datos.
 */
@Injectable({ providedIn: 'root' })
export class GameDataService {
  /**
   * Respaldo en memoria para cuando localStorage no esta disponible (modo
   * privado, almacenamiento bloqueado). La partida sigue funcionando; lo unico
   * que se pierde es que sobreviva a recargar la pagina.
   */
  private memoryFallback: Data = { kids: [], junior: [] };

  getScores(): Observable<Data> {
    return of(this.read());
  }

  setData(data: PartialData): Observable<StoreScoreResponse> {
    const difficult = data.difficult === 'kids' || data.difficult === 'junior' ? data.difficult : null;

    if (difficult === null) {
      // Misma comprobacion que hacia el backend: sin esto se crearian rankings
      // fantasma que nunca se leen ni se podan.
      return throwError(() => new Error('La dificultad no es valida.'));
    }

    const nickname = data.nickname.trim().replace(/\s+/g, ' ').slice(0, 40);

    if (nickname.length < 2) {
      return throwError(() => new Error('El nickname debe tener al menos 2 caracteres.'));
    }

    const score = Math.min(MAX_SCORE, Math.max(0, Math.trunc(data.score)));

    const store = this.read();
    const entry: Body = {
      id: this.nextId(store),
      difficult,
      nickname,
      score,
      created_at: new Date().toISOString(),
    };

    // Se ordena y se poda igual que lo hacia el servidor, para que la pantalla
    // de resultados siga viendo exactamente la misma forma de datos.
    const ranked = rank([...store[difficult], entry]).slice(0, TOP_LIMIT);
    const updated: Data = { ...store, [difficult]: ranked };

    this.write(updated);

    // null si el puntaje no alcanzo el top y la poda lo dejo fuera.
    const index = ranked.findIndex(item => item.id === entry.id);
    const position = index === -1 ? null : index + 1;

    return of({
      mensaje: 'Nueva puntuacion agregada',
      score: entry,
      ranking: { position, in_top: position !== null, top_limit: TOP_LIMIT },
    });
  }

  /** Vacia el ranking guardado en este navegador. */
  clear(): void {
    this.write({ kids: [], junior: [] });
  }

  // ---------- Persistencia ----------

  private read(): Data {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw === null) {
        return { kids: [], junior: [] };
      }

      return normalize(JSON.parse(raw));
    } catch {
      /*
        Cubre dos casos a la vez: localStorage bloqueado, y un JSON corrupto o
        de una version anterior. En ambos se devuelve el respaldo en memoria en
        vez de romper la pantalla de resultados: un ranking vacio es mejor
        informacion que una excepcion.
      */
      return this.memoryFallback;
    }
  }

  private write(data: Data): void {
    this.memoryFallback = data;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Sin persistencia: el ranking vive solo en memoria hasta recargar.
    }
  }

  /** Los ids solo tienen que ser unicos dentro de este navegador. */
  private nextId(store: Data): number {
    const ids = [...store.kids, ...store.junior].map(item => item.id);
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  }
}

/**
 * Orden del ranking.
 *
 * El desempate por fecha y por id lo hace determinista: con solo `score desc`,
 * dos puntajes iguales salian en orden arbitrario y la tabla cambiaba de
 * posiciones entre recargas.
 */
function rank(items: Body[]): Body[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    const dateA = a.created_at ?? '';
    const dateB = b.created_at ?? '';

    return dateA === dateB ? a.id - b.id : dateA.localeCompare(dateB);
  });
}

/** Descarta cualquier cosa del almacen que no tenga la forma esperada. */
function normalize(raw: unknown): Data {
  const source = (raw ?? {}) as Record<string, unknown>;

  return {
    kids: toEntries(source['kids']),
    junior: toEntries(source['junior']),
  };
}

function toEntries(raw: unknown): Body[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is Body =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Body).id === 'number' &&
      typeof (item as Body).nickname === 'string' &&
      typeof (item as Body).score === 'number' &&
      Number.isFinite((item as Body).score)
    )
    .slice(0, TOP_LIMIT);
}
