/**
 * Inyecta la URL de la API en src/environments/environment.ts durante el build.
 *
 * Motivo: Angular resuelve los environments en tiempo de compilacion, no lee
 * process.env en el navegador. En Vercel se define la variable API_URL en el
 * panel del proyecto y este script la escribe antes de `ng build`.
 *
 * Se dispara desde el hook `prebuild` de package.json.
 *
 * Si API_URL no esta definida el script NO toca el archivo: asi un `npm run
 * build` local no genera ruido en git y se respeta el valor commiteado.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/environments/environment.ts');

// API_URL es el nombre que se usa en Vercel y en docker-compose.
// NG_APP_API_URL se acepta por compatibilidad con la convencion de Angular.
const apiUrl = process.env.API_URL ?? process.env.NG_APP_API_URL ?? '';

if (!apiUrl) {
  console.log(
    '[set-env] API_URL no definida: se mantiene src/environments/environment.ts tal cual.'
  );
  process.exit(0);
}

// Normaliza: quita la barra final y agrega /api si no viene incluido.
let normalized = apiUrl.trim().replace(/\/+$/, '');
if (!/\/api$/.test(normalized)) {
  normalized = `${normalized}/api`;
}

try {
  // Falla temprano si la URL es invalida, en vez de generar un bundle roto.
  new URL(normalized);
} catch {
  console.error(`[set-env] API_URL no es una URL valida: "${apiUrl}"`);
  process.exit(1);
}

/*
  URL del canal en vivo del estado.

  En produccion Reverb va detras del mismo nginx que la API, en /ws, para no
  tener que exponer un segundo puerto (Render solo publica uno por servicio).
  Por eso se deriva de la API: mismo host, ws:// o wss:// segun el esquema.

  WS_URL permite fijarla a mano si el socket vive en otro sitio.
*/
const wsUrl =
  process.env.WS_URL?.trim().replace(/\/+$/, '') ??
  normalized.replace(/^http/, 'ws').replace(/\/api$/, '/ws');

// Clave publica de Reverb: viaja al navegador, solo sirve para suscribirse a
// canales publicos. El secreto nunca sale del servidor.
const reverbKey = process.env.REVERB_APP_KEY?.trim() || 'harsimuverse-status';

const contents = `// ARCHIVO GENERADO por scripts/set-env.mjs durante el build.
// No editar a mano: los cambios se sobreescriben si API_URL esta definida.
// Para desarrollo se usa environment.development.ts (ver fileReplacements en angular.json).
export const environment = {
  production: true,
  apiUrl: '${normalized}',
  wsUrl: '${wsUrl}',
  reverbKey: '${reverbKey}',
};
`;

writeFileSync(target, contents, 'utf8');
console.log(`[set-env] environment.ts -> apiUrl = ${normalized}`);
console.log(`[set-env] environment.ts -> wsUrl  = ${wsUrl}`);
