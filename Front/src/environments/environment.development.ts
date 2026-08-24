// Entorno de DESARROLLO (`ng serve` / `npm start`).
// angular.json lo sustituye por environment.ts mediante fileReplacements.
//
// Ya no hay apiUrl ni wsUrl: el juego no habla con ningun servidor. Los
// puntajes viven en localStorage (ver Services/game-data.service.ts).
export const environment = {
  production: false,
};
