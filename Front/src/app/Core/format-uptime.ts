/**
 * El tiempo encendido, en palabras.
 *
 * Por debajo de la hora se dan los minutos exactos, porque es la escala que
 * distingue un arranque en frio de un servicio que ya estaba en marcha —que es
 * justo la pregunta que el dato responde. A partir de ahi se redondea hacia
 * abajo con "mas de": entre 3 y 4 horas encendido no hay ninguna decision que
 * cambie, asi que el minuto exacto solo es ruido.
 */
export function formatUptime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) {
    return 'desconocido';
  }

  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds < 60) {
    return 'menos de un minuto';
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return totalMinutes === 1 ? '1 minuto' : `${totalMinutes} minutos`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 24) {
    return totalHours === 1 ? 'más de 1 hora' : `más de ${totalHours} horas`;
  }

  const totalDays = Math.floor(totalHours / 24);

  return totalDays === 1 ? 'más de 1 día' : `más de ${totalDays} días`;
}

/**
 * Por debajo de este tiempo encendido se asume que fue esta visita la que
 * desperto el servicio.
 *
 * El arranque en frio ronda el minuto; dos minutos deja margen para que el
 * usuario haya estado leyendo la pantalla mientras despertaba.
 */
const LIKELY_WOKEN_MS = 120_000;

/**
 * Traduce el tiempo encendido a lo que significa, en vez de dejar el numero
 * suelto. Devuelve null cuando no hay nada util que anadir.
 */
export function describeUptime(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) {
    return null;
  }

  return ms < LIKELY_WOKEN_MS
    ? 'probablemente lo despertó esta visita'
    : 'ya estaba en marcha';
}
