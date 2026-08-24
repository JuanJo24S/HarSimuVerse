<?php

namespace App\Http\Requests;

use App\Models\Score;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validacion del POST /api/score.
 *
 * Antes la validacion vivia dentro del controlador y aceptaba cualquier string
 * de 255 caracteres como dificultad, asi que un cliente podia crear rankings
 * fantasma ("Kids", "KIDS", "loquesea") que nunca se limpiaban ni se leian.
 */
class StoreScoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Endpoint publico: el juego no tiene autenticacion.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'difficult' => ['required', 'string', Rule::in(Score::difficulties())],
            'nickname' => ['required', 'string', 'min:2', 'max:40'],
            // Cota superior para que un cliente manipulado no meta un puntaje
            // absurdo que bloquee el top 5 para siempre.
            'score' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }

    /**
     * Normaliza antes de validar: espacios de sobra y mayusculas en la
     * dificultad hacian fallar la comparacion contra la lista permitida.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'difficult' => is_string($this->input('difficult'))
                ? strtolower(trim($this->input('difficult')))
                : $this->input('difficult'),
            'nickname' => is_string($this->input('nickname'))
                // Colapsa espacios internos y recorta: " juan   perez " -> "juan perez".
                ? preg_replace('/\s+/u', ' ', trim($this->input('nickname')))
                : $this->input('nickname'),
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'difficult.required' => 'La dificultad es obligatoria.',
            'difficult.in' => 'La dificultad debe ser "kids" o "junior".',
            'nickname.required' => 'El nickname es obligatorio.',
            'nickname.min' => 'El nickname debe tener al menos 2 caracteres.',
            'nickname.max' => 'El nickname no puede pasar de 40 caracteres.',
            'score.required' => 'El puntaje es obligatorio.',
            'score.integer' => 'El puntaje debe ser un numero entero.',
            // Estos dos faltaban: el front muestra el mensaje del backend tal
            // cual, asi que un puntaje fuera de rango le llegaba al jugador en
            // ingles ("The score field must be at least 0.").
            'score.min' => 'El puntaje no puede ser negativo.',
            'score.max' => 'El puntaje excede el maximo permitido.',
        ];
    }
}
