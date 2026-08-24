<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use PDOException;
use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_la_raiz_devuelve_el_descriptor_json(): void
    {
        // La raiz ya no renderiza la vista welcome de Laravel (eliminada junto
        // con el scaffolding de Vite): ahora es un descriptor JSON.
        $this->getJson('/')
            ->assertOk()
            ->assertJsonStructure(['name', 'status', 'api' => ['scores'], 'health']);
    }

    public function test_el_healthcheck_responde(): void
    {
        // Render usa esta ruta para saber si el servicio esta vivo.
        $this->get('/up')->assertOk();
    }

    // ---------- /api/health ----------

    public function test_health_es_publico_y_devuelve_la_forma_esperada(): void
    {
        // Sin autenticacion a proposito: se consulta ANTES de que haya sesion,
        // justo cuando no se sabe si el servicio esta vivo.
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonStructure(['status', 'database', 'uptimeMs', 'timestamp'])
            ->assertJsonPath('status', 'online')
            ->assertJsonPath('database', 'connected');
    }

    public function test_health_devuelve_el_uptime_como_numero(): void
    {
        $uptime = $this->getJson('/api/health')->assertOk()->json('uptimeMs');

        // Como numero y no como texto: el cliente lo compara con umbrales para
        // decidir si la visita desperto el servicio.
        $this->assertIsInt($uptime);
        $this->assertGreaterThanOrEqual(0, $uptime);
    }

    public function test_health_prohibe_que_se_cachee(): void
    {
        /*
          Si un proxy o el navegador sirvieran la respuesta anterior, el cliente
          creeria que el servicio sigue arriba cuando ya se suspendio: el estado
          diria exactamente lo contrario de la realidad.
        */
        $response = $this->getJson('/api/health')->assertOk();

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_health_informa_de_la_base_caida_sin_dejar_de_responder(): void
    {
        /*
          El caso que da sentido a separar los dos campos: el proceso contesta
          (status online) pero la aplicacion no puede servir (database
          disconnected). Fundirlos en un valor perderia el diagnostico.
        */
        DB::shouldReceive('connection')->andThrow(new PDOException('base caida'));

        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'online')
            ->assertJsonPath('database', 'disconnected');
    }
}
