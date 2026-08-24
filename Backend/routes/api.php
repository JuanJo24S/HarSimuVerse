<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas de la API
|--------------------------------------------------------------------------
|
| El prefijo /api y el rate limit los aplica bootstrap/app.php.
| Solo index y store: el juego no borra ni edita puntajes.
|
*/

/*
 * Estado del servicio. Publico y con un limite mas holgado que el resto: el
 * cliente lo consulta al arrancar, al volver a la pestana, al recuperar la red
 * y cada 4 minutos para que el plan gratuito no lo suspenda mientras se usa.
 * Con el throttle general (60/min) varias pestanas abiertas se lo comerian.
 */
Route::get('health', HealthController::class)
    ->middleware('throttle:180,1')
    ->name('health');

Route::get('score', [ScoreController::class, 'index'])->name('score.index');

// Limite mas estricto en la escritura: una partida no termina 20 veces por minuto.
Route::post('score', [ScoreController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('score.store');
