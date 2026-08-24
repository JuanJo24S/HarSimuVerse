// Entorno de DESARROLLO (`ng serve` / `npm start`).
// angular.json lo sustituye por environment.ts mediante fileReplacements.
// El navegador corre en el host, por eso apunta a localhost y no a los nombres
// de los servicios de Docker.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',

  // Canal en vivo del estado. En desarrollo Reverb se publica directamente en
  // su puerto; en produccion va detras de nginx, en /ws.
  wsUrl: 'ws://localhost:8081',

  // Clave publica de Reverb: viaja al navegador por diseno, solo permite
  // suscribirse a canales publicos.
  reverbKey: 'harsimuverse-status',
};
