<?php

namespace App\Providers;

use App\Listeners\SendStatusOnSubscribe;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Reverb\Events\MessageReceived;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /*
          Manda el estado en cuanto alguien se suscribe al canal, en vez de
          hacerle esperar al siguiente latido (hasta 25 segundos).

          Se registra a mano y no por descubrimiento automatico porque el evento
          es de Reverb, no de la aplicacion, y solo se dispara dentro del proceso
          del servidor WebSocket.
        */
        Event::listen(MessageReceived::class, SendStatusOnSubscribe::class);
    }
}
