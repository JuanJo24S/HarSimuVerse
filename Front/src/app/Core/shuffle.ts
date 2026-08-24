/**
 * Baraja una coleccion sin mutar la original (Fisher-Yates).
 *
 * Estaba copiada palabra por palabra en tres juegos (game1, game2 y
 * tech-memory). Una sola copia evita que las barajas se separen entre si con el
 * tiempo: es justo el tipo de funcion en la que un arreglo aplicado a una copia
 * y no a las otras pasa desapercibido.
 */
export function shuffle<T>(input: readonly T[]): T[] {
  const result = [...input];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
