<?php
/* ==========================================================================
   Conexión a la base de datos (PDO) y carga inicial de datos
   Los datos iniciales (lugares, agenda de actividades, usuario demo) se leen
   de php/seed.json, generado desde js/data.js para que ambos backends usen
   exactamente la misma información.
   ========================================================================== */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    if (DB_DRIVER === 'mysql') {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    } else {
        $dir = dirname(DB_SQLITE_PATH);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . DB_SQLITE_PATH, null, null, $opts);
        $pdo->exec('PRAGMA foreign_keys = ON');
        create_sqlite_schema($pdo);
    }
    seed_if_empty($pdo);
    return $pdo;
}

/** Esquema SQLite (equivalente a php/schema.sql para MySQL). */
function create_sqlite_schema(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL, codigo TEXT NOT NULL UNIQUE, correo TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL, programa TEXT DEFAULT '', semestre INTEGER NULL,
            telefono TEXT DEFAULT '', foto TEXT DEFAULT '', es_demo INTEGER NOT NULL DEFAULT 0, creado TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS places (
            id TEXT PRIMARY KEY, nombre TEXT NOT NULL, categoria TEXT NOT NULL, descripcion TEXT NOT NULL,
            ubicacion TEXT NOT NULL, imagen TEXT NOT NULL, campus TEXT NULL, mapa_x REAL NULL, mapa_y REAL NULL,
            orden INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY, titulo TEXT NOT NULL, categoria TEXT NOT NULL, modalidad TEXT NOT NULL,
            place_id TEXT NOT NULL REFERENCES places(id), fecha TEXT NOT NULL, inicio TEXT NOT NULL, fin TEXT NOT NULL,
            horas INTEGER NOT NULL, cupos_totales INTEGER NOT NULL, ocupados_base INTEGER NOT NULL DEFAULT 0,
            descripcion TEXT DEFAULT '', fuente TEXT NULL, es_demo INTEGER NOT NULL DEFAULT 0, nota_horas TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_id TEXT NOT NULL REFERENCES events(id),
            estado TEXT NOT NULL DEFAULT 'inscrita', qr TEXT DEFAULT '', encuesta TEXT NULL,
            creado TEXT NOT NULL, cancelada_el TEXT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_id TEXT NULL, titulo TEXT NOT NULL, categoria TEXT NOT NULL, place_id TEXT NOT NULL,
            fecha TEXT NOT NULL, inicio TEXT NOT NULL, fin TEXT NOT NULL, horas INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            dia INTEGER NOT NULL, inicio TEXT NOT NULL, fin TEXT NOT NULL, materia TEXT NOT NULL, salon TEXT DEFAULT ''
        );
    ");
}

function seed_data(): array
{
    static $seed = null;
    if ($seed === null) {
        $seed = json_decode((string) file_get_contents(__DIR__ . '/seed.json'), true);
    }
    return $seed;
}

function demo_classes(): array
{
    return array_map(fn ($c) => [$c['dia'], $c['inicio'], $c['fin'], $c['materia'], $c['salon']], seed_data()['classes']);
}

function rel_date(int $days): string
{
    return date('Y-m-d', strtotime(($days >= 0 ? '+' : '') . $days . ' days'));
}

/** Lunes de la semana actual (si hoy es domingo, el lunes siguiente). */
function week_monday(): int
{
    $w = (int) date('w');
    return strtotime(date('Y-m-d') . ($w === 0 ? ' +1 day' : ' -' . ($w - 1) . ' days'));
}

function seed_if_empty(PDO $pdo): void
{
    if ((int) $pdo->query('SELECT COUNT(*) FROM places')->fetchColumn() > 0) {
        return;
    }
    $s = seed_data();
    $pdo->beginTransaction();
    try {
        $ip = $pdo->prepare('INSERT INTO places (id, nombre, categoria, descripcion, ubicacion, imagen, campus, mapa_x, mapa_y, orden) VALUES (?,?,?,?,?,?,?,?,?,?)');
        foreach ($s['places'] as $i => $p) {
            $ip->execute([$p['id'], $p['nombre'], $p['categoria'], $p['descripcion'], $p['ubicacion'], $p['imagen'], $p['campus'],
                $p['mapa']['x'] ?? null, $p['mapa']['y'] ?? null, $i + 1]);
        }
        $mon = week_monday();
        $ie = $pdo->prepare('INSERT INTO events (id, titulo, categoria, modalidad, place_id, fecha, inicio, fin, horas, cupos_totales, ocupados_base, descripcion, fuente, es_demo, nota_horas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach ($s['agenda'] as $a) {
            $ie->execute([$a['id'], $a['titulo'], $a['categoria'], $a['modalidad'], $a['placeId'], date('Y-m-d', strtotime("+{$a['d']} days", $mon)),
                $a['inicio'], $a['fin'], $a['horas'], $a['cupos'], $a['ocupados'], $s['descripciones'][$a['categoria']] ?? '',
                $a['fuente'] ?? null, !empty($a['demo']) ? 1 : 0, $a['notaHoras'] ?? '']);
        }

        // Usuario de demostración (persona ficticia)
        $u = $s['user'];
        $pdo->prepare('INSERT INTO users (nombre, codigo, correo, password_hash, programa, semestre, telefono, foto, es_demo, creado) VALUES (?,?,?,?,?,?,?,?,1,?)')
            ->execute([$u['nombre'], $u['codigo'], $u['correo'], password_hash($u['password'], PASSWORD_DEFAULT), $u['programa'], $u['semestre'], '', '', date('Y-m-d')]);
        $uid = (int) $pdo->lastInsertId();

        $ih = $pdo->prepare('INSERT INTO history (user_id, titulo, categoria, place_id, fecha, inicio, fin, horas) VALUES (?,?,?,?,?,?,?,?)');
        foreach ($s['history'] as [$off, $ini, $fin, $titulo, $placeId, $horas, $cat]) {
            $ih->execute([$uid, $titulo, $cat, $placeId, rel_date((int) $off), $ini, $fin, $horas]);
        }

        // Inscripciones de ejemplo (misma lógica que buildSeedDB en js/data.js)
        $today = date('Y-m-d');
        $evs = $pdo->query('SELECT * FROM events ORDER BY fecha, inicio')->fetchAll();
        $past = array_values(array_filter($evs, fn ($e) => $e['fecha'] < $today));
        $future = array_values(array_filter($evs, fn ($e) => $e['fecha'] > $today && $e['cupos_totales'] > $e['ocupados_base']));
        $lastOf = fn ($arr, $mod) => array_values(array_filter($arr, fn ($e) => $e['modalidad'] === $mod));
        $en = $pdo->prepare('INSERT INTO enrollments (user_id, event_id, estado, creado) VALUES (?,?,?,?)');
        $pv = $lastOf($past, 'virtual');
        if ($pv) $en->execute([$uid, end($pv)['id'], 'asistencia', $today]);
        $pp = $lastOf($past, 'presencial');
        if ($pp) $en->execute([$uid, end($pp)['id'], 'inscrita', $today]);
        foreach ($future as $e) { if ($e['modalidad'] === 'presencial' && $e['place_id'] !== 'coliseo-csu') { $en->execute([$uid, $e['id'], 'inscrita', $today]); break; } }
        foreach ($future as $e) { if ($e['modalidad'] === 'virtual') { $en->execute([$uid, $e['id'], 'inscrita', $today]); break; } }
        $fp = $lastOf($future, 'presencial');
        if ($fp) $en->execute([$uid, end($fp)['id'], 'cancelada', $today]);

        $ic = $pdo->prepare('INSERT INTO classes (user_id, dia, inicio, fin, materia, salon) VALUES (?,?,?,?,?,?)');
        foreach (demo_classes() as $c) {
            $ic->execute([$uid, ...$c]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
