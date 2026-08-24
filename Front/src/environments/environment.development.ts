// Entorno de DESARROLLO (`ng serve` / `npm start`).
// angular.json lo sustituye por environment.ts mediante fileReplacements.
//
// Apunta al backend LOCAL (docker compose) a proposito. Poner aqui la URL de
// Render tiene dos efectos malos: el stack local deja de usarse, y cada
// `ng serve` abierto le hace ping al servicio desplegado cada 4 minutos,
// gastando horas de la cuota gratuita sin que nadie lo este usando.
//
// El navegador corre en el host, por eso es localhost y no los nombres de los
// servicios de Docker.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',

  // En desarrollo Reverb se publica directamente en su puerto; en produccion va
  // detras de nginx, en /ws.
  wsUrl: 'ws://localhost:8081',

  // Clave publica de Reverb: viaja al navegador por diseno, solo permite
  // suscribirse a canales publicos.
  reverbKey: 'harsimuverse-status',
};
