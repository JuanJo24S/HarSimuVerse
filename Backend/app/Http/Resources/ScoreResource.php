<?php

namespace App\Http\Resources;

use App\Models\Score;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Forma del puntaje en el JSON.
 *
 * Antes se serializaba el modelo entero, lo que exponia updated_at y dejaba
 * el contrato atado al esquema de la tabla.
 *
 * @mixin Score
 */
class ScoreResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'difficult' => $this->difficult,
            'nickname' => $this->nickname,
            'score' => (int) $this->score,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
