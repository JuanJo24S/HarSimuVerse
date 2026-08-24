import { DestroyRef, Injectable, signal } from '@angular/core';

/** Pista que suena en el menu y entre pantallas. */
export const DEFAULT_TRACK = '/assets/Audios/MusicaFondo.mp3';

const MUTED_STORAGE_KEY = 'harsimuverse:muted';

/**
 * Unico gestor de musica del juego.
 *
 * Antes habia dos fuentes de audio compitiendo: este servicio reproducia
 * MusicaFondo.mp3 en loop de forma global, y ademas cada minijuego creaba su
 * propio `new Audio(...)` con un IntersectionObserver. Resultado: dos pistas
 * sonando encima de la otra en cada nivel.
 *
 * Ahora hay una sola pista activa. Cada pantalla pide la suya con playTrack()
 * y, al destruirse, se vuelve sola a la pista por defecto.
 *
 * Tambien se quito el intento de autoplay agresivo del constructor (que
 * escuchaba click, touchstart, keydown y mousemove en el document y llenaba la
 * consola de avisos de autoplay bloqueado). El splash de la app ya es el gesto
 * del usuario que habilita el sonido.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  /** Silencio, persistido entre sesiones. */
  readonly muted = signal(readMuted());

  private audio: HTMLAudioElement | null = null;
  private currentSrc = '';

  /** El navegador no permite reproducir hasta el primer gesto del usuario. */
  private unlocked = false;

  /** Pista pedida antes del primer gesto: se reproduce en cuanto se desbloquea. */
  private pending: { src: string; volume: number } | null = null;

  /**
   * Habilita el audio. Se llama desde el click del splash, que es el gesto que
   * el navegador exige para permitir la reproduccion.
   */
  unlock(): void {
    this.unlocked = true;

    if (this.pending) {
      const { src, volume } = this.pending;
      this.pending = null;
      this.playTrack(src, { volume });
    } else if (this.audio) {
      this.attempt();
    } else {
      this.playDefault();
    }
  }

  /**
   * Cambia la pista activa.
   *
   * @param destroyRef Si se pasa, al destruirse el componente se vuelve a la
   *   pista por defecto automaticamente.
   */
  playTrack(
    src: string,
    options: { volume?: number; destroyRef?: DestroyRef } = {}
  ): void {
    const { volume = 0.35, destroyRef } = options;

    if (!this.unlocked) {
      // Sin gesto del usuario no se intenta nada: se recuerda la peticion.
      this.pending = { src, volume };
      destroyRef?.onDestroy(() => {
        if (this.pending?.src === src) {
          this.pending = null;
        }
      });
      return;
    }

    // Volver a pedir la misma pista no la reinicia desde cero.
    if (this.currentSrc === src && this.audio) {
      this.audio.volume = volume;
      this.attempt();
    } else {
      this.stop();

      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = volume;
      audio.muted = this.muted();

      this.audio = audio;
      this.currentSrc = src;
      this.attempt();
    }

    destroyRef?.onDestroy(() => {
      // Solo si esta pantalla sigue siendo la dueña de la pista: al navegar,
      // el componente nuevo ya pidio la suya antes de que muera el anterior.
      if (this.currentSrc === src) {
        this.playDefault();
      }
    });
  }

  /** Vuelve a la musica de menu. */
  playDefault(): void {
    this.playTrack(DEFAULT_TRACK, { volume: 0.25 });
  }

  /** Alterna silencio. Devuelve el nuevo estado. */
  toggleMute(): boolean {
    const next = !this.muted();
    this.muted.set(next);
    persistMuted(next);

    if (this.audio) {
      this.audio.muted = next;
      if (!next) {
        this.attempt();
      }
    }

    return next;
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.currentSrc = '';
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.min(1, Math.max(0, volume));
    }
  }

  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  private attempt(): void {
    // play() devuelve una promesa que el navegador rechaza si aun no hay
    // permiso de autoplay. Es un caso esperado, no un error de la app.
    this.audio?.play().catch(() => undefined);
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    // Modo privado o almacenamiento bloqueado.
    return false;
  }
}

function persistMuted(value: boolean): void {
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, String(value));
  } catch {
    // Sin persistencia: no es critico.
  }
}
