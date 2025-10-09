<?php

use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

Route::apiResource('score', ScoreController::class)->only(['index', 'store']);
