<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS)
|--------------------------------------------------------------------------
|
| El front vive en Vercel y la API en Render: son origenes distintos, asi que
| el navegador exige cabeceras CORS explicitas. Los origenes permitidos se
| definen por entorno para no publicar una API abierta a cualquier dominio.
|
| CORS_ALLOWED_ORIGINS  lista separada por comas de origenes exactos.
| FRONTEND_URL          origen adicional (el que ya usa Laravel por convencion).
|
| Ejemplo en Render:
|   CORS_ALLOWED_ORIGINS=https://harsimuverse.vercel.app
|
*/

$origins = collect(explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))
    ->push((string) env('FRONTEND_URL', ''))
    ->map(fn (string $origin) => rtrim(trim($origin), '/'))
    ->filter()
    ->unique()
    ->values()
    ->all();

// En local se permite cualquier puerto de localhost para no pelear con el
// puerto que asigne Angular o docker-compose.
$patterns = [];

if (env('APP_ENV') === 'local') {
    $patterns[] = '#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#';
}

// Los previews de Vercel cambian de subdominio en cada deploy.
if ($previewPattern = env('CORS_ALLOWED_ORIGIN_PATTERN')) {
    $patterns[] = $previewPattern;
}

return [

    'paths' => ['api/*', 'up'],

    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],

    // Si no se configuro ningun origen se cae a localhost para desarrollo,
    // nunca a '*': con '*' cualquier sitio podria escribir puntajes.
    'allowed_origins' => $origins !== [] ? $origins : ['http://localhost:4200'],

    'allowed_origins_patterns' => $patterns,

    'allowed_headers' => ['Accept', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    // La API no usa cookies ni sesiones: no hacen falta credenciales.
    'supports_credentials' => false,

];
