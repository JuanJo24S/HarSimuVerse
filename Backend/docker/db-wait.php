<?php
/**
 * Espera a que la base de datos acepte conexiones.
 * Se usa desde los entrypoints porque `docker compose depends_on: healthy`
 * cubre el arranque en compose, pero no el caso de un Postgres externo
 * (Render) que puede tardar en aceptar la primera conexion tras un deploy.
 *
 * Uso: php db-wait.php <intentos> <segundos-entre-intentos>
 */

$attempts = (int) ($argv[1] ?? 30);
$delay    = (int) ($argv[2] ?? 2);

$connection = getenv('DB_CONNECTION') ?: 'sqlite';

// SQLite es un archivo local: no hay nada que esperar.
if ($connection === 'sqlite') {
    exit(0);
}

$url = getenv('DB_URL') ?: getenv('DATABASE_URL') ?: '';

if ($url !== '') {
    $parts  = parse_url($url);
    $host   = $parts['host'] ?? '127.0.0.1';
    $port   = $parts['port'] ?? ($connection === 'pgsql' ? 5432 : 3306);
    $dbname = ltrim($parts['path'] ?? '', '/');
    $user   = $parts['user'] ?? '';
    $pass   = $parts['pass'] ?? '';
} else {
    $host   = getenv('DB_HOST') ?: '127.0.0.1';
    $port   = getenv('DB_PORT') ?: ($connection === 'pgsql' ? 5432 : 3306);
    $dbname = getenv('DB_DATABASE') ?: 'harsimuverse';
    $user   = getenv('DB_USERNAME') ?: 'postgres';
    $pass   = getenv('DB_PASSWORD') ?: '';
}

$driver = $connection === 'pgsql' ? 'pgsql' : 'mysql';
$dsn    = sprintf('%s:host=%s;port=%s;dbname=%s', $driver, $host, $port, $dbname);

for ($i = 1; $i <= $attempts; $i++) {
    try {
        new PDO($dsn, $user, $pass, [PDO::ATTR_TIMEOUT => 3]);
        fwrite(STDERR, "[db-wait] Base de datos lista ({$host}:{$port}/{$dbname}).\n");
        exit(0);
    } catch (PDOException $e) {
        fwrite(STDERR, "[db-wait] Intento {$i}/{$attempts} fallido: {$e->getMessage()}\n");
        if ($i < $attempts) {
            sleep($delay);
        }
    }
}

fwrite(STDERR, "[db-wait] La base de datos no respondio tras {$attempts} intentos.\n");
exit(1);
