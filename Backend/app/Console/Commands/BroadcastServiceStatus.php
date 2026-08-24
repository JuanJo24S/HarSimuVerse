<?php

namespace App\Console\Commands;

use App\Events\ServiceStatusBroadcast;
use App\Support\ServiceStatus;
use Illuminate\Console\Command;
use Throwable;

/**
 * Emite el latido del estado por el canal en vivo.
 *
 * Corre como proceso propio (supervisord en produccion, un servicio de compose
 * en desarrollo) porque Reverb no sabe programarse a si mismo: solo reparte lo
 * que le llega.
 *
 * No usa el scheduler de Laravel a proposito: el scheduler tiene granularidad
 * de un minuto y aqui el intervalo son 25 segundos, por debajo de su resolucion.
 */
class BroadcastServiceStatus extends Command
{
    protected $signature = 'status:heartbeat
                            {--interval=25 : Segundos entre latidos}';

    protected $description = 'Emite el estado del servicio por el canal en vivo cada N segundos';

    public function handle(ServiceStatus $status): int
    {
        $interval = max(5, (int) $this->option('interval'));

        $this->info("Latido de estado cada {$interval}s. Ctrl+C para parar.");

        /*
          El bucle es infinito por diseno: es un proceso de larga vida que
          supervisord reinicia si muere. `trap` deja que un SIGTERM del PaaS lo
          pare limpio en vez de esperar a que lo maten.
        */
        $running = true;
        $this->trap([SIGTERM, SIGINT], function () use (&$running) {
            $running = false;
        });

        while ($running) {
            try {
                ServiceStatusBroadcast::dispatch($status->toArray());
            } catch (Throwable $e) {
                /*
                  Si Reverb todavia no acepta conexiones (arranque en frio, los
                  dos procesos suben a la vez) el dispatch falla. No es motivo
                  para tumbar el latido: se anota y se reintenta al siguiente
                  ciclo.
                */
                $this->warn('No se pudo emitir el latido: '.$e->getMessage());
            }

            // sleep() en trozos de 1s para que la senal de parada se atienda
            // enseguida y no haya que esperar el intervalo entero.
            for ($i = 0; $i < $interval && $running; $i++) {
                sleep(1);
            }
        }

        $this->info('Latido detenido.');

        return self::SUCCESS;
    }
}
