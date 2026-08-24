<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Latido del estado del servicio por el canal en vivo.
 *
 * Canal PUBLICO: no lleva nada privado (solo si el servicio esta en pie, si la
 * base responde y cuanto lleva encendido) y tiene que poder consultarse sin
 * sesion, que es justo el momento en que hace falta.
 *
 * Ojo con lo que este evento NO hace: no existe un mensaje de "servicio caido".
 * Un servicio apagado no puede anunciar que esta apagado. Lo que delata la
 * caida es la AUSENCIA de latido, y eso lo deduce el cliente con su watchdog.
 *
 * ShouldBroadcastNow y no ShouldBroadcast: con una cola de por medio el latido
 * llegaria tarde o se acumularia, y un estado con retraso miente igual que un
 * estado equivocado.
 */
class ServiceStatusBroadcast implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('service-status');
    }

    public function broadcastAs(): string
    {
        return 'status';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
