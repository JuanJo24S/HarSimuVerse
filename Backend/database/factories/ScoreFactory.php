<?php

namespace Database\Factories;

use App\Models\Score;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Score>
 */
class ScoreFactory extends Factory
{
    protected $model = Score::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'difficult' => fake()->randomElement(Score::difficulties()),
            'nickname' => fake()->firstName(),
            'score' => fake()->numberBetween(0, 500),
        ];
    }

    public function kids(): static
    {
        return $this->state(fn () => ['difficult' => Score::DIFFICULTY_KIDS]);
    }

    public function junior(): static
    {
        return $this->state(fn () => ['difficult' => Score::DIFFICULTY_JUNIOR]);
    }

    public function withScore(int $score): static
    {
        return $this->state(fn () => ['score' => $score]);
    }
}
