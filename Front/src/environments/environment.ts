// Entorno de PRODUCCION.
// Los valores los sobreescribe scripts/set-env.mjs durante el build cuando
// API_URL esta definida (Vercel, build de Docker). Los defaults de aqui solo
// aplican si se compila sin esa variable.
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8000/api',
  wsUrl: 'ws://localhost:8081',
  reverbKey: 'harsimuverse-status',
};
