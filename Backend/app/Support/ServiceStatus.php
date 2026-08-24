<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Estado del servicio, tal como lo publican /api/health y el canal en vivo.
 *
 * Los dos consumidores usan esta misma clase para que no puedan divergir: si el
 * endpoint dijera una cosa y el latido otra, el cliente parpadearia entre
 * estados sin que nada hubiera cambiado de verdad.
 */
class ServiceStatus
{
    /**
     * Cuanto se reutiliza el resultado de la comprobacion de base.
     *
     * El latido (cada 25s) y el endpoint HTTP consultan por su cuenta. Sin
     * cache, con la base caida cada uno pagaria su propia espera hasta el
     * timeout de conexion. Diez segundos es corto para que el dato siga siendo
     * util, y suficiente para que dos consultas seguidas no se sumen.
     */
    private const DB_CACHE_SECONDS = 10;

    private const DB_CACHE_KEY = 'service-status:database';

    /** Marca de arranque del proceso, escrita por el entrypoint del contenedor. */
    private const BOOT_FILE = 'boot_time';

    /**
     * El objeto que viaja por HTTP y por el socket.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $payload = [
            'status' => 'online',
            'uptimeMs' => $this->uptimeMs(),
            'timestamp' => now()->toIso8601String(),
        ];

        /*
          `database` va como campo propio y no fundido dentro de `status`.
          Que el proceso PHP conteste no significa que la aplicacion sirva: sin
          base de datos el ranking falla entero, y anunciar "en linea" en ese
          caso es peor que no decir nada, porque manda al usuario a una pantalla
          que va a romperse.
        */
        $payload['database'] = $this->databaseState();

        return $payload;
    }

    /**
     * Milisegundos que lleva encendido el proceso.
     *
     * Responde a la unica pregunta que importa en un plan gratuito: el servicio
     * ya estaba en marcha, o lo levanto esta visita.
     *
     * PHP-FPM no tiene un "uptime de proceso" util (cada peticion la atiende un
     * worker distinto, reciclado cada pm.max_requests), asi que el ancla es el
     * arranque del CONTENEDOR, que es justo lo que el plan gratuito suspende y
     * vuelve a levantar. El entrypoint escribe el fichero al arrancar.
     */
    public function uptimeMs(): int
    {
        $path = storage_path('app/'.self::BOOT_FILE);

        if (! is_file($path)) {
            /*
              Fuera de Docker (o si el entrypoint no llego a escribirlo) se crea
              en la primera consulta. El dato queda subestimado, no inventado:
              dira "recien arrancado", que es la lectura prudente.
            */
            @file_put_contents($path, (string) time());

            return 0;
        }

        $bootedAt = (int) trim((string) @file_get_contents($path));

        if ($bootedAt <= 0) {
            return 0;
        }

        return max(0, (time() - $bootedAt) * 1000);
    }

    /**
     * Estado de la base: 'connected' o 'disconnected'.
     *
     * La comprobacion es real —abre la conexion y lanza una consulta— no
     * asumida a partir de la configuracion.
     */
    public function databaseState(): string
    {
        return Cache::remember(
            self::DB_CACHE_KEY,
            self::DB_CACHE_SECONDS,
            fn (): string => $this->probeDatabase() ? 'connected' : 'disconnected'
        );
    }

    /**
     * Abre la conexion y la valida con una consulta trivial.
     *
     * El `SELECT 1` no es ceremonia: getPdo() puede devolver un handle de una
     * conexion que el servidor ya cerro por su cuenta, y eso solo se descubre
     * al usarla.
     */
    private function probeDatabase(): bool
    {
        try {
            DB::connection()->select('select 1');

            return true;
        } catch (Throwable $e) {
            // A nivel debug: con la base caida esto se repetiria cada 10s y
            // llenaria los logs de un PaaS que cobra por retencion.
            Log::debug('Comprobacion de base fallida: '.$e->getMessage());

            return false;
        }
    }

    /** Fuerza que la proxima consulta vuelva a comprobar de verdad. */
    public function forgetDatabaseCache(): void
    {
        Cache::forget(self::DB_CACHE_KEY);
    }
}
