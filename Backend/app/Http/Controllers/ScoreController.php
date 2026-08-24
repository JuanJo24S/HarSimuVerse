<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScoreRequest;
use App\Http\Resources\ScoreResource;
use App\Models\Score;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Ranking de puntajes del juego.
 *
 * Solo se conservan los TOP_LIMIT mejores puntajes por dificultad: la tabla es
 * un marcador, no un historial.
 */
class ScoreController extends Controller
{
    /**
     * GET /api/score — top de cada dificultad.
     */
    public function index(): JsonResponse
    {
        // Antes este metodo llamaba a cleanScores(): un GET borraba filas.
        // Ademas de ser un efecto secundario inesperado en una lectura, hacia
        // que un simple refresh del marcador escribiera en la base. La poda
        // ahora vive solo en store(), que es donde puede entrar una fila nueva.
        $payload = [];

        foreach (Score::difficulties() as $difficulty) {
            $payload[$difficulty] = ScoreResource::collection(
                Score::query()
                    ->ofDifficulty($difficulty)
                    ->ranked()
                    ->limit(Score::TOP_LIMIT)
                    ->get()
            );
        }

        return response()->json($payload);
    }

    /**
     * POST /api/score — registra un puntaje y devuelve su posicion.
     */
    public function store(StoreScoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Insertar y podar en la misma transaccion: si dos partidas terminan a
        // la vez, sin esto se podia borrar la fila que la otra peticion acababa
        // de insertar y quedar con menos de TOP_LIMIT registros.
        $score = DB::transaction(function () use ($data): Score {
            $score = Score::create($data);

            $this->pruneToTop($data['difficult']);

            return $score;
        });

        // El front muestra "quedaste en el puesto N" sin tener que pedir el
        // ranking completo despues de guardar. Devuelve null si el puntaje no
        // alcanzo el top y la poda ya lo borro.
        $position = $this->positionOf($score);

        return response()->json([
            'mensaje' => 'Nueva puntuacion agregada',
            'score' => new ScoreResource($score),
            'ranking' => [
                // null si el puntaje no entro al top y ya fue podado.
                'position' => $position,
                'in_top' => $position !== null,
                'top_limit' => Score::TOP_LIMIT,
            ],
        ], 201);
    }

    /**
     * Deja unicamente los TOP_LIMIT mejores puntajes de una dificultad.
     *
     * Se resuelve en dos consultas (ids + delete) en vez de un DELETE con
     * subconsulta con LIMIT, porque MySQL no permite LIMIT dentro de una
     * subconsulta que apunta a la misma tabla del DELETE.
     */
    private function pruneToTop(string $difficulty): void
    {
        $keep = Score::query()
            ->ofDifficulty($difficulty)
            ->ranked()
            ->limit(Score::TOP_LIMIT)
            // La transaccion sola no bastaba. Sin bloquear las filas, dos
            // partidas que terminan a la vez leen la misma lista de "a
            // conservar" y cada una borra la fila que la otra acababa de
            // insertar: el top se quedaba con menos de TOP_LIMIT registros.
            // El bloqueo serializa ambas podas. En SQLite es un no-op (el
            // driver ya escribe en exclusiva), en Postgres es FOR UPDATE.
            ->lockForUpdate()
            ->pluck('id');

        Score::query()
            ->ofDifficulty($difficulty)
            ->whereNotIn('id', $keep)
            ->delete();
    }

    /**
     * Posicion (1-indexada) de un puntaje dentro de su dificultad,
     * o null si ya no esta en el top.
     */
    private function positionOf(Score $score): ?int
    {
        $ids = Score::query()
            ->ofDifficulty($score->difficult)
            ->ranked()
            ->limit(Score::TOP_LIMIT)
            ->pluck('id')
            ->all();

        $index = array_search($score->id, $ids, true);

        return $index === false ? null : $index + 1;
    }
}
