<?php

namespace Tests\Feature;

use App\Support\ServiceStatus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Mockery;
use PDOException;
use RuntimeException;
use Tests\TestCase;

class ServiceStatusTest extends TestCase
{
    private function serviceStatus(): ServiceStatus
    {
        return app(ServiceStatus::class);
    }

    // ---------- Comprobacion de la base ----------

    public function test_reporta_connected_con_una_conexion_valida(): void
    {
        // La base de tests es SQLite en memoria: una conexion real y sana.
        $this->assertSame('connected', $this->serviceStatus()->databaseState());
    }

    public function test_reporta_disconnected_cuando_la_conexion_falla(): void
    {
        // PDOException es el caso habitual: base apagada, credenciales malas o
        // host inalcanzable.
        DB::shouldReceive('connection')->once()->andThrow(
            new PDOException('could not connect to server')
        );

        $this->assertSame('disconnected', $this->serviceStatus()->databaseState());
    }

    public function test_reporta_disconnected_ante_cualquier_excepcion(): void
    {
        /*
          No solo PDOException. El probe captura Throwable a proposito: un fallo
          de resolucion DNS, un driver ausente o un error de configuracion lanzan
          otras clases, y si se escapara una, /api/health devolveria un 500 en vez
          de informar. Justo cuando mas falta hace saber que pasa.
        */
        DB::shouldReceive('connection')->once()->andThrow(
            new RuntimeException('driver no disponible')
        );

        $this->assertSame('disconnected', $this->serviceStatus()->databaseState());
    }

    public function test_la_consulta_valida_la_conexion_no_solo_la_abre(): void
    {
        /*
          getPdo() puede devolver un handle de una conexion que el servidor ya
          cerro por su cuenta; eso solo se descubre al usarla. Por eso el probe
          lanza un `select 1` y no se conforma con abrir.
        */
        $connection = Mockery::mock();
        $connection->shouldReceive('select')->once()->with('select 1')->andThrow(
            new PDOException('server closed the connection unexpectedly')
        );

        DB::shouldReceive('connection')->once()->andReturn($connection);

        $this->assertSame('disconnected', $this->serviceStatus()->databaseState());
    }

    // ---------- Cache ----------

    public function test_cachea_el_resultado_para_no_pagar_la_espera_dos_veces(): void
    {
        /*
          Esta es la proteccion contra la trampa del enunciado: el latido (cada
          25s) y el endpoint HTTP consultan por su cuenta. Sin cache, con la base
          caida cada uno esperaria su propio timeout de conexion. La segunda
          llamada no debe tocar la base.
        */
        DB::shouldReceive('connection')->once()->andThrow(new PDOException('caida'));

        $first = $this->serviceStatus()->databaseState();
        $second = $this->serviceStatus()->databaseState();

        $this->assertSame('disconnected', $first);
        $this->assertSame('disconnected', $second);
        // El `once()` de arriba ya falla si hubo una segunda consulta real.
    }

    public function test_se_puede_invalidar_la_cache(): void
    {
        $status = $this->serviceStatus();

        $this->assertSame('connected', $status->databaseState());
        $this->assertTrue(Cache::has('service-status:database'));

        $status->forgetDatabaseCache();

        $this->assertFalse(Cache::has('service-status:database'));
    }

    // ---------- Uptime ----------

    public function test_el_uptime_es_un_entero_no_negativo(): void
    {
        $uptime = $this->serviceStatus()->uptimeMs();

        $this->assertIsInt($uptime);
        $this->assertGreaterThanOrEqual(0, $uptime);
    }

    public function test_crea_la_marca_de_arranque_si_no_existe(): void
    {
        // Fuera de Docker el entrypoint no la escribe. El uptime queda
        // subestimado ("recien arrancado"), que es la lectura prudente, en vez
        // de inventar un valor.
        $path = storage_path('app/boot_time');
        @unlink($path);

        $uptime = $this->serviceStatus()->uptimeMs();

        $this->assertSame(0, $uptime);
        $this->assertFileExists($path);
    }

    public function test_ignora_una_marca_de_arranque_corrupta(): void
    {
        file_put_contents(storage_path('app/boot_time'), 'no-es-una-fecha');

        $this->assertSame(0, $this->serviceStatus()->uptimeMs());
    }

    public function test_calcula_el_uptime_desde_la_marca(): void
    {
        file_put_contents(storage_path('app/boot_time'), (string) (time() - 120));

        // 120s = 120000ms, con un margen por el segundo que puede cruzarse.
        $this->assertGreaterThanOrEqual(119_000, $this->serviceStatus()->uptimeMs());
        $this->assertLessThanOrEqual(122_000, $this->serviceStatus()->uptimeMs());
    }

    // ---------- Forma del objeto ----------

    public function test_el_objeto_separa_el_estado_del_servicio_del_de_la_base(): void
    {
        $payload = $this->serviceStatus()->toArray();

        $this->assertSame('online', $payload['status']);
        $this->assertArrayHasKey('database', $payload);
        $this->assertArrayHasKey('uptimeMs', $payload);
        $this->assertArrayHasKey('timestamp', $payload);
    }

    public function test_el_servicio_sigue_online_aunque_la_base_este_caida(): void
    {
        /*
          Es la distincion que da valor al endpoint: el proceso responde (por eso
          hay respuesta) pero la aplicacion no puede servir. Fundir las dos cosas
          en un unico valor perderia justo el diagnostico util.
        */
        DB::shouldReceive('connection')->once()->andThrow(new PDOException('caida'));

        $payload = $this->serviceStatus()->toArray();

        $this->assertSame('online', $payload['status']);
        $this->assertSame('disconnected', $payload['database']);
    }
}
