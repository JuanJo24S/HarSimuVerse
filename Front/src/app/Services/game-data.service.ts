import { Injectable } from '@angular/core';

import { Body, Data, PartialData, StoreScoreResponse } from '../Models/data';

/** Clave del almacen. Con prefijo para no chocar con otras apps del dominio. */
const STORAGE_KEY = 'harsimuverse:scores';

/** Cuantos puntajes se conservan por dificultad. */
const TOP_LIMIT = 5;

/** Cota superior del puntaje, para que un error de calculo no bloquee el top. */
const MAX_SCORE = 100_000;

/**
 * Ranking de puntajes, guardado en el navegador.
 *
 * El ranking es POR NAVEGADOR: cada tablet ve solo sus propios puntajes, y se
 * pierden si se limpian los datos del sitio o se juega en modo privado.
 *
 * La API es sincrona a proposito. Antes esto hablaba por HTTP y devolvia
 * Observables, con sus estados de carga, de error y de reintento. Leer una
 * clave de localStorage es inmediato y no puede fallar por red, asi que todo
 * aquello era ceremonia para simular una espera que ya no existe.
 */
@Injectable({ providedIn: 'root' })
export class GameDataService {
  /**
   * Respaldo en memoria para cuando localStorage no esta disponible (modo
   * privado, almacenamiento bloqueado). La partida sigue funcionando; lo unico
   * que se pierde es que sobreviva a recargar la pagina.
   */
  private memoryFallback: Data = { kids: [], junior: [] };

  /** El ranking completo. */
  getScores(): Data {
    return this.read();
  }

  /**
   * Registra un puntaje y devuelve el puesto conseguido.
   *
   * Devuelve null si el puntaje no era registrable. En la practica no ocurre:
   * el guard de la pantalla de resultados ya exige una partida valida. Se
   * comprueba igual para que un estado corrupto no meta basura en el ranking.
   */
  saveScore(data: PartialData): StoreScoreResponse | null {
    const difficult = data.difficult === 'kids' || data.difficult === 'junior' ? data.difficult : null;
    const nickname = data.nickname.trim().replace(/\s+/g, ' ').slice(0, 40);

    if (difficult === null || nickname.length < 2) {
      return null;
    }

    const store = this.read();
    const entry: Body = {
      id: this.nextId(store),
      difficult,
      nickname,
      score: Math.min(MAX_SCORE, Math.max(0, Math.trunc(data.score))),
      created_at: new Date().toISOString(),
    };

    const ranked = rank([...store[difficult], entry]).slice(0, TOP_LIMIT);
    this.write({ ...store, [difficult]: ranked });

    // null si el puntaje no alcanzo el top y la poda lo dejo fuera.
    const index = ranked.findIndex(item => item.id === entry.id);
    const position = index === -1 ? null : index + 1;

    return {
      score: entry,
      ranking: { position, in_top: position !== null, top_limit: TOP_LIMIT },
    };
  }

  /** Vacia el ranking guardado en este navegador. */
  clear(): void {
    this.write({ kids: [], junior: [] });
  }

  // ---------- Persistencia ----------

  private read(): Data {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      return raw === null ? { kids: [], junior: [] } : normalize(JSON.parse(raw));
    } catch {
      /*
        Cubre dos casos: localStorage bloqueado, y un JSON corrupto o de una
        version anterior. En ambos se devuelve el respaldo en memoria en vez de
        romper la pantalla: un ranking vacio informa mejor que una excepcion.
      */
      return this.memoryFallback;
    }
  }

  private write(data: Data): void {
    this.memoryFallback = data;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Sin persistencia: el ranking vive en memoria hasta recargar.
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
 * El desempate por fecha y por id lo hace determinista: con solo el puntaje,
 * dos iguales salian en orden arbitrario y la tabla cambiaba entre recargas.
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

  return { kids: toEntries(source['kids']), junior: toEntries(source['junior']) };
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
