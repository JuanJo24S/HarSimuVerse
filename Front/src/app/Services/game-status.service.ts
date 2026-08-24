import { Injectable, computed, signal } from '@angular/core';

/** Dificultades soportadas. Coinciden con las rutas y con el backend. */
export type Difficulty = 'kids' | 'junior';

/** Vidas con las que empieza cada partida. */
export const INITIAL_LIVES = 3;

const STORAGE_KEYS = {
  lives: 'lives',
  score: 'score',
  nickname: 'nickname',
  difficult: 'difficult',
  submitted: 'submitted',
  position: 'position',
} as const;

/**
 * Estado de la partida en curso (nickname, dificultad, vidas y puntaje).
 *
 * Se persiste en sessionStorage para que un refresco accidental a mitad de
 * partida no borre el progreso.
 */
@Injectable({ providedIn: 'root' })
export class GameStatusService {
  readonly lives = signal<number>(readNumber(STORAGE_KEYS.lives, INITIAL_LIVES));
  readonly score = signal<number>(readNumber(STORAGE_KEYS.score, 0));
  readonly nickname = signal<string>(readString(STORAGE_KEYS.nickname));
  readonly difficult = signal<string>(readString(STORAGE_KEYS.difficult));

  /**
   * Marca si el puntaje de esta partida ya se envio al backend.
   * Evita duplicados si el jugador refresca la pantalla de resultados o vuelve
   * a ella con el boton "atras" del navegador.
   */
  readonly submitted = signal<boolean>(readString(STORAGE_KEYS.submitted) === 'true');

  /**
   * Puesto conseguido en el ranking, o null si el puntaje no entro al top.
   *
   * Se persiste junto a `submitted` porque los dos se leen a la vez al pintar
   * los resultados. Sin esto, al refrescar la pantalla de resultados el
   * componente se saltaba el POST (correcto: ya estaba enviado) pero se quedaba
   * sin la posicion, y el mensaje caia al ramal "esta vez no alcanzo para el
   * top 5" aunque el jugador fuera el numero 1.
   */
  readonly position = signal<number | null>(readNullableNumber(STORAGE_KEYS.position));

  /** Array para pintar los corazones en la plantilla sin logica inline. */
  readonly livesArray = computed(() => Array.from({ length: this.lives() }));

  readonly isGameOver = computed(() => this.lives() <= 0);

  /**
   * Hay una partida valida en curso. Lo usa el guard de rutas: antes se podia
   * entrar directo a /kids/level-3 por URL, jugar sin nickname y enviar al
   * backend un nickname vacio que el servidor rechazaba con un 422 silencioso.
   */
  readonly hasActiveRun = computed(
    () => this.nickname().trim().length >= 2 && this.difficult().length > 0
  );

  // ---------- Ciclo de la partida ----------

  /** Arranca una partida nueva: limpia puntaje, vidas y el flag de envio. */
  startRun(nickname: string, difficult: Difficulty): void {
    this.setNickname(nickname);
    this.setDifficult(difficult);
    this.setScore(0);
    this.setLives(INITIAL_LIVES);
    this.setSubmitted(false);
    this.setPosition(null);
  }

  /** Reinicia vidas y puntaje conservando nickname y dificultad. */
  restartRun(): void {
    this.setScore(0);
    this.setLives(INITIAL_LIVES);
    this.setSubmitted(false);
    this.setPosition(null);
  }

  // ---------- Vidas ----------

  setLives(value: number): void {
    const safe = Math.max(0, Math.trunc(value));
    this.lives.set(safe);
    write(STORAGE_KEYS.lives, safe);
  }

  /** Reinicia las vidas al valor inicial. */
  resetLives(): void {
    this.setLives(INITIAL_LIVES);
  }

  loseLife(): void {
    this.setLives(this.lives() - 1);
  }

  gainLife(): void {
    this.setLives(this.lives() + 1);
  }

  // ---------- Puntaje ----------

  setScore(value: number): void {
    const safe = Math.max(0, Math.trunc(value));
    this.score.set(safe);
    write(STORAGE_KEYS.score, safe);
  }

  addScore(points: number): void {
    this.setScore(this.score() + Math.max(0, Math.trunc(points)));
  }

  resetScore(): void {
    this.setScore(0);
  }

  // ---------- Identidad ----------

  setNickname(name: string): void {
    // Colapsa espacios: el backend hace lo mismo, asi que el ranking coincide
    // con lo que se muestra en pantalla.
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
    this.nickname.set(clean);
    write(STORAGE_KEYS.nickname, clean);
  }

  getNickname(): string {
    return this.nickname();
  }

  setDifficult(difficult: string): void {
    this.difficult.set(difficult);
    write(STORAGE_KEYS.difficult, difficult);
  }

  setSubmitted(value: boolean): void {
    this.submitted.set(value);
    write(STORAGE_KEYS.submitted, value);
  }

  setPosition(value: number | null): void {
    this.position.set(value);

    if (value === null) {
      remove(STORAGE_KEYS.position);
      return;
    }

    write(STORAGE_KEYS.position, value);
  }

  /**
   * Borra todo el estado.
   *
   * Antes solo reseteaba los signals y dejaba sessionStorage intacto, asi que
   * al recargar la pagina reaparecian el nickname y el puntaje de la partida
   * anterior.
   */
  resetAll(): void {
    this.nickname.set('');
    this.score.set(0);
    this.difficult.set('');
    this.lives.set(INITIAL_LIVES);
    this.submitted.set(false);
    this.position.set(null);

    try {
      Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    } catch {
      // sessionStorage no disponible: los signals ya quedaron limpios.
    }
  }
}

// ---------- Acceso tolerante a sessionStorage ----------
// En modo privado o con el almacenamiento bloqueado, sessionStorage lanza
// excepcion. Sin estos guardas la app no arrancaba en esos navegadores,
// porque los signals se inicializan al construir el servicio.

function readString(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function readNumber(key: string, fallback: number): number {
  const raw = readString(key);
  if (raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readNullableNumber(key: string): number | null {
  const raw = readString(key);
  if (raw === '') {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function remove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Sin persistencia: el signal ya quedo limpio.
  }
}

function write(key: string, value: string | number | boolean): void {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Sin persistencia: la partida sigue funcionando en memoria.
  }
}
