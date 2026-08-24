<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas web
|--------------------------------------------------------------------------
|
| Este backend es solo API: el frontend es una app Angular independiente
| desplegada en Vercel. La raiz devuelve un descriptor JSON en vez de la
| vista welcome de Laravel, que arrastraba una dependencia de Vite/npm que
| este proyecto no usa.
|
*/

Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'status' => 'ok',
    'api' => [
        'scores' => url('/api/score'),
    ],
    'health' => url('/up'),
]))->name('root');
