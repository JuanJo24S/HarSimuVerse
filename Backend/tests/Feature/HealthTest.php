<?php

namespace Tests\Feature;

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
}
