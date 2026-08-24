<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Puntaje de una partida terminada.
 *
 * @property int $id
 * @property string $difficult
 * @property string $nickname
 * @property int $score
 */
class Score extends Model
{
    use HasFactory;

    /**
     * Dificultades validas. Coinciden con las rutas del front
     * (/kids/level-N y /junior/level-N).
     */
    public const DIFFICULTY_KIDS = 'kids';

    public const DIFFICULTY_JUNIOR = 'junior';

    /**
     * Cuantos puntajes se conservan por dificultad.
     */
    public const TOP_LIMIT = 5;

    protected $fillable = ['difficult', 'nickname', 'score'];

    /**
     * Sin esto `score` viaja como string en el JSON cuando el driver es
     * Postgres, y el front lo ordena/compara mal.
     */
    protected $casts = [
        'score' => 'integer',
    ];

    /**
     * @return list<string>
     */
    public static function difficulties(): array
    {
        return [self::DIFFICULTY_KIDS, self::DIFFICULTY_JUNIOR];
    }

    /**
     * Orden del ranking. El desempate por fecha y por id lo hace determinista:
     * con solo `score desc` dos puntajes iguales salian en orden arbitrario y
     * la tabla cambiaba de posiciones entre recargas.
     */
    public function scopeRanked(Builder $query): Builder
    {
        return $query
            ->orderByDesc('score')
            ->orderBy('created_at')
            ->orderBy('id');
    }

    public function scopeOfDifficulty(Builder $query, string $difficulty): Builder
    {
        return $query->where('difficult', $difficulty);
    }
}
