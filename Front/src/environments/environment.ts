// Entorno de PRODUCCION.
// El valor de apiUrl lo sobreescribe scripts/set-env.mjs cuando la variable
// API_URL esta definida (Vercel, Docker build). El default de aqui solo aplica
// si se compila sin esa variable.
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8000/api',
};
