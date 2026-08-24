// Entorno de PRODUCCION.
//
// Ya no hay apiUrl ni wsUrl: el juego no habla con ningun servidor. Los
// puntajes viven en localStorage (ver Services/game-data.service.ts).
export const environment = {
  production: true,
};
