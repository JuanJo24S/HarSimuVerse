<?php

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

Route::get('score', [ScoreController::class, 'index'])->name('score.index');

// Limite mas estricto en la escritura: una partida no termina 20 veces por minuto.
Route::post('score', [ScoreController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('score.store');
