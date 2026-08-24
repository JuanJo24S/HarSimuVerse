import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';
import { CountdownTimer } from './countdown-timer';

/**
 * Envoltorio de SweetAlert2 con estilo unificado para todo el juego.
 *
 * Ademas congela el reloj mientras el modal esta abierto: antes el tiempo
 * seguia corriendo mientras el jugador leia "Respuesta incorrecta", asi que
 * los avisos costaban segundos de partida.
 */
export async function gameDialog(
  options: SweetAlertOptions,
  timer?: CountdownTimer | null
): Promise<SweetAlertResult> {
  timer?.pause();

  try {
    return await Swal.fire({
      // Colores y textos por defecto para no repetirlos en cada llamada.
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Continuar',
      // El juego es para ninos: evitamos que un Enter accidental cierre el
      // modal antes de que lean el mensaje.
      allowEnterKey: false,
      heightAuto: false,
      ...options,
    });
  } finally {
    timer?.resume();
  }
}

/** Aviso corto que se cierra solo. No devuelve interaccion del usuario. */
export function gameToast(options: SweetAlertOptions): void {
  void Swal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    heightAuto: false,
    ...options,
  });
}

/** Cierra cualquier modal abierto. Se usa en ngOnDestroy al cambiar de ruta. */
export function closeGameDialogs(): void {
  if (Swal.isVisible()) {
    Swal.close();
  }
}
