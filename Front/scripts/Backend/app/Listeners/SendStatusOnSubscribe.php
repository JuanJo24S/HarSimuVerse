<?php

namespace App\Listeners;

use App\Support\ServiceStatus;
use Laravel\Reverb\Events\MessageReceived;
use Throwable;

/**
 * Envia el estado en cuanto un cliente se suscribe al canal.
 *
 * Sin esto, quien conectaba tenia que esperar al siguiente latido: hasta 25
 * segundos mirando "comprobando" con el servicio perfectamente vivo. Medido
 * antes de este listener: 13,8s / 8,8s / 3,8s segun donde cayera el ciclo.
 *
 * Corre dentro del proceso de Reverb, que es donde se reciben los mensajes de
 * los clientes. El latido periodico sigue viviendo en su propio proceso; este
 * solo cubre el arranque de cada conexion.
 */
class SendStatusOnSubscribe
{
    public function __construct(private readonly ServiceStatus $status)
    {
    }

    public function handle(MessageReceived $event): void
    {
        try {
            $message = json_decode($event->message, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            // Trama ilegible: no es asunto de este listener, Reverb ya la maneja.
            return;
        }

        if (! is_array($message) || ($message['event'] ?? null) !== 'pusher:subscribe') {
            return;
        }

        if (($message['data']['channel'] ?? null) !== 'service-status') {
            return;
        }

        try {
            /*
              Se manda solo a ESTA conexion, no al canal entero. Emitir al canal
              haria que cada cliente nuevo provocara un mensaje redundante a
              todos los que ya estaban conectados.

              La forma de la trama es la del protocolo Pusher: `data` viaja como
              cadena JSON dentro del sobre, igual que lo que emite el latido, para
              que el cliente no tenga que distinguir de donde vino.
            */
            $event->connection->send(json_encode([
                'event' => 'status',
                'channel' => 'service-status',
                'data' => json_encode($this->status->toArray()),
            ], JSON_THROW_ON_ERROR));
        } catch (Throwable) {
            // Si la conexion se cayo entre el subscribe y esto, no hay nada que
            // hacer: el cliente reconectara y volvera a suscribirse.
        }
    }
}
