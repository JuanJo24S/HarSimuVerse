<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\Request;

class ScoreController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Limpiar primero
        $this->cleanScores();

        // Obtener los top 5 por dificultad
        $kidsScores = Score::where('difficult', 'kids')
            ->orderBy('score', 'desc')
            ->take(5)
            ->get();

        $juniorScores = Score::where('difficult', 'junior')
            ->orderBy('score', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'kids' => $kidsScores,
            'junior' => $juniorScores
        ], 200);
    }



    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'difficult' => 'required|string|max:255',
            'nickname' => 'required|string|max:255',
            'score' => 'required|integer|min:0'
        ]);

        $score = Score::create([
            'difficult' => $request->difficult,
            'nickname' => $request->nickname,
            'score' => $request->score
        ]);

        $this->cleanScores();

        return response()->json([
            'mensaje' => 'Nueva puntuacion agregada',
            'score' => $score
        ], 201);


    }

    private function cleanScores()
    {
        // Dificultades que quieres controlar
        $difficulties = ['kids', 'junior'];

        foreach ($difficulties as $diff) {
            // Tomar los 5 mejores de esta dificultad
            $top5 = Score::where('difficult', $diff)
                ->orderBy('score', 'desc')
                ->take(5)
                ->pluck('id');

            // Eliminar todos los demás
            Score::where('difficult', $diff)
                ->whereNotIn('id', $top5)
                ->delete();
        }
    }
}
