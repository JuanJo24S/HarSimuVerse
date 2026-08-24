// Entorno de DESARROLLO (`ng serve` / `npm start`).
// angular.json lo sustituye por environment.ts mediante fileReplacements.
// El navegador corre en el host, por eso apunta a localhost y no al nombre
// del servicio de Docker.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
};
