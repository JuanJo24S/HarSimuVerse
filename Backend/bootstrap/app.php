<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        // Antes decia __DIR__.'./../routes/api.php', que resuelve a
        // "bootstrap./../routes/api.php": un segmento de ruta inexistente.
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Limite de peticiones por IP para el endpoint publico de puntajes.
        $middleware->throttleApi('60,1');

        /*
         * Proxies de confianza.
         *
         * Render pone un proxy delante: sin esto Laravel genera URLs http:// y
         * ve la IP del proxy, no la del cliente.
         *
         * Pero confiar en '*' significa confiar en la cabecera X-Forwarded-For
         * venga de donde venga, y esa cabecera la escribe el cliente. Cualquiera
         * podia mandar `X-Forwarded-For: <ip al azar>` en cada peticion y
         * saltarse por completo los limites throttle:60,1 y throttle:20,1, que
         * se calculan justamente por IP.
         *
         * Por defecto se confia solo en rangos privados, que es de donde sale el
         * proxy interno de Render: si la conexion no viene de ahi, la cabecera se
         * ignora y se usa la IP real de la conexion. TRUSTED_PROXIES permite
         * ajustarlo sin tocar codigo (acepta '*' si el proveedor lo exigiera).
         */
        $proxies = (string) env('TRUSTED_PROXIES', '');

        $middleware->trustProxies(at: $proxies === '*'
            ? '*'
            : ($proxies !== ''
                ? array_values(array_filter(array_map('trim', explode(',', $proxies))))
                : ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.1', '::1']));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // El front consume JSON siempre: nunca devolvemos HTML de error.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson()
        );

        // Formato de error consistente para los 422 de validacion.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Los datos enviados no son validos.',
                'errors' => $e->errors(),
            ], 422);
        });
    })->create();
