<?php

namespace App\Http\Controllers;

use App\Support\ServiceStatus;
use Illuminate\Http\JsonResponse;

/**
 * Estado del servicio.
 *
 * Publico y sin autenticacion a proposito: es lo que consulta el cliente ANTES
 * de pintar nada, justamente cuando todavia no hay sesion ni se sabe si el
 * servicio esta vivo.
 */
class HealthController extends Controller
{
    public function __invoke(ServiceStatus $status): JsonResponse
    {
        return response()->json($status->toArray())
            /*
              Sin esto un proxy o el propio navegador pueden servir de cache la
              respuesta anterior, y el cliente creeria que el servicio sigue
              arriba cuando ya se suspendio. El estado nunca se cachea.
            */
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache');
    }
}
