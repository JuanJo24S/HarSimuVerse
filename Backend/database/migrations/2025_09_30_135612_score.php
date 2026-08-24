<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Nota: antes este archivo importaba `Laravel\Prompts\table`, una funcion de
// consola que no se usaba y que no tiene nada que ver con Schema::table.

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();
            $table->string('difficult', 20);
            $table->string('nickname', 40);
            $table->unsignedInteger('score');
            $table->timestamps();

            // Toda consulta del ranking filtra por dificultad y ordena por
            // puntaje: este indice compuesto la cubre entera.
            $table->index(['difficult', 'score'], 'scores_difficult_score_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};
