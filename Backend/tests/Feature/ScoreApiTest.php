<?php

namespace Tests\Feature;

use App\Models\Score;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoreApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_devuelve_el_top_de_cada_dificultad(): void
    {
        Score::factory()->kids()->withScore(100)->create(['nickname' => 'ana']);
        Score::factory()->kids()->withScore(300)->create(['nickname' => 'beto']);
        Score::factory()->junior()->withScore(50)->create(['nickname' => 'caro']);

        $response = $this->getJson('/api/score');

        $response->assertOk()
            ->assertJsonStructure([
                'kids' => [['id', 'difficult', 'nickname', 'score', 'created_at']],
                'junior' => [['id', 'difficult', 'nickname', 'score', 'created_at']],
            ]);

        // Ordenado de mayor a menor.
        $this->assertSame(['beto', 'ana'], array_column($response->json('kids'), 'nickname'));
        $this->assertSame(['caro'], array_column($response->json('junior'), 'nickname'));
    }

    public function test_index_no_borra_filas(): void
    {
        // Regresion: index() llamaba a cleanScores(), asi que un GET podaba la
        // tabla. Con mas de TOP_LIMIT filas, leer el ranking borraba datos.
        Score::factory()->kids()->count(Score::TOP_LIMIT + 3)->create();

        $this->getJson('/api/score')->assertOk();

        $this->assertSame(
            Score::TOP_LIMIT + 3,
            Score::where('difficult', Score::DIFFICULTY_KIDS)->count()
        );
    }

    public function test_index_devuelve_como_maximo_el_top_limit(): void
    {
        Score::factory()->kids()->count(Score::TOP_LIMIT + 4)->create();

        $response = $this->getJson('/api/score');

        $response->assertOk();
        $this->assertCount(Score::TOP_LIMIT, $response->json('kids'));
    }

    public function test_store_guarda_el_puntaje_y_devuelve_la_posicion(): void
    {
        Score::factory()->kids()->withScore(500)->create();

        $response = $this->postJson('/api/score', [
            'difficult' => 'kids',
            'nickname' => 'juancho',
            'score' => 200,
        ]);

        $response->assertCreated()
            ->assertJsonPath('score.nickname', 'juancho')
            ->assertJsonPath('score.score', 200)
            ->assertJsonPath('ranking.position', 2)
            ->assertJsonPath('ranking.in_top', true);

        $this->assertDatabaseHas('scores', ['nickname' => 'juancho', 'score' => 200]);
    }

    public function test_store_poda_a_top_limit_por_dificultad(): void
    {
        Score::factory()->kids()->count(Score::TOP_LIMIT)->withScore(900)->create();
        Score::factory()->junior()->count(3)->create();

        $this->postJson('/api/score', [
            'difficult' => 'kids',
            'nickname' => 'nuevo',
            'score' => 1,
        ])->assertCreated();

        $this->assertSame(
            Score::TOP_LIMIT,
            Score::where('difficult', Score::DIFFICULTY_KIDS)->count()
        );

        // La poda no debe tocar la otra dificultad.
        $this->assertSame(3, Score::where('difficult', Score::DIFFICULTY_JUNIOR)->count());
    }

    public function test_store_reporta_position_null_cuando_no_entra_al_top(): void
    {
        Score::factory()->kids()->count(Score::TOP_LIMIT)->withScore(900)->create();

        $this->postJson('/api/score', [
            'difficult' => 'kids',
            'nickname' => 'ultimo',
            'score' => 1,
        ])->assertCreated()
            ->assertJsonPath('ranking.position', null)
            ->assertJsonPath('ranking.in_top', false);

        $this->assertDatabaseMissing('scores', ['nickname' => 'ultimo']);
    }

    public function test_store_rechaza_dificultades_desconocidas(): void
    {
        // Antes cualquier string de hasta 255 chars pasaba la validacion, asi que
        // se podian crear rankings fantasma que nunca se leian ni se podaban.
        $this->postJson('/api/score', [
            'difficult' => 'imposible',
            'nickname' => 'juancho',
            'score' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors('difficult');

        $this->assertDatabaseCount('scores', 0);
    }

    public function test_store_normaliza_dificultad_y_nickname(): void
    {
        $this->postJson('/api/score', [
            'difficult' => '  KIDS ',
            'nickname' => "  juan   perez  ",
            'score' => 10,
        ])->assertCreated();

        $this->assertDatabaseHas('scores', [
            'difficult' => 'kids',
            'nickname' => 'juan perez',
        ]);
    }

    /**
     * @return array<string, array{array<string, mixed>, string}>
     */
    public static function payloadsInvalidos(): array
    {
        return [
            'sin nickname' => [['difficult' => 'kids', 'score' => 10], 'nickname'],
            'nickname corto' => [['difficult' => 'kids', 'nickname' => 'a', 'score' => 10], 'nickname'],
            'sin score' => [['difficult' => 'kids', 'nickname' => 'juancho'], 'score'],
            'score negativo' => [['difficult' => 'kids', 'nickname' => 'juancho', 'score' => -5], 'score'],
            'score no entero' => [['difficult' => 'kids', 'nickname' => 'juancho', 'score' => 'abc'], 'score'],
            'sin dificultad' => [['nickname' => 'juancho', 'score' => 10], 'difficult'],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('payloadsInvalidos')]
    public function test_store_valida_el_payload(array $payload, string $campoEsperado): void
    {
        $this->postJson('/api/score', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors($campoEsperado);
    }
}
