<?php

/**
 * Bootstrap de PHPUnit.
 *
 * Existe por un problema concreto de este proyecto: corre dentro de Docker, y
 * docker-compose exporta DB_CONNECTION=pgsql, CACHE_STORE=file, etc. como
 * variables de entorno REALES del contenedor.
 *
 * El bloque <php><env force="true"> de phpunit.xml no consigue ganarles: PHPUnit
 * escribe esos valores en $_ENV y putenv(), pero las variables que inyecta
 * Docker estan tambien en $_SERVER, que es donde Laravel las lee primero. El
 * resultado medido antes de este archivo era:
 *
 *     CACHE_STORE env='file' | config=file | DB=pgsql
 *
 * es decir, la suite se ejecutaba contra la base de datos de DESARROLLO. Y como
 * los tests usan RefreshDatabase, cada `php artisan test` migraba en fresco esa
 * base: correr los tests BORRABA los puntajes reales de desarrollo. Ademas el
 * rate limiter escribia en el cache de archivos, que sobrevive entre tests y
 * entre ejecuciones, asi que los ultimos tests recibian 429 en vez del status
 * que esperaban.
 *
 * Fijar los valores en las tres fuentes ($_SERVER, $_ENV y putenv) antes de
 * cargar el autoload resuelve las dos cosas: nada posterior las pisa, porque el
 * .env se carga de forma inmutable (no sobreescribe lo que ya existe).
 */

$testing = [
    'APP_ENV' => 'testing',
    'APP_DEBUG' => 'true',
    'APP_MAINTENANCE_DRIVER' => 'file',

    // Base efimera en memoria: rapida y, sobre todo, aislada de la de desarrollo.
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:',

    // Laravel da prioridad a la URL de conexion sobre DB_CONNECTION. Si queda
    // una viva (Render exporta DATABASE_URL), los tests volverian a Postgres.
    'DB_URL' => '',
    'DATABASE_URL' => '',

    // En memoria y por proceso: el rate limiter arranca limpio en cada test.
    'CACHE_STORE' => 'array',
    'SESSION_DRIVER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'MAIL_MAILER' => 'array',

    'BCRYPT_ROUNDS' => '4',
    'TELESCOPE_ENABLED' => 'false',
    'PULSE_ENABLED' => 'false',
    'NIGHTWATCH_ENABLED' => 'false',
];

foreach ($testing as $key => $value) {
    if ($value === '') {
        // Una cadena vacia sigue siendo un valor definido: hay que quitarla.
        putenv($key);
        unset($_ENV[$key], $_SERVER[$key]);
        continue;
    }

    putenv("{$key}={$value}");
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}

require __DIR__.'/../vendor/autoload.php';
