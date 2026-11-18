<?php
/* ==========================================================================
   Funciones auxiliares del backend: validación, mapeo y reglas de negocio
   ========================================================================== */

declare(strict_types=1);

final class ApiException extends RuntimeException {}

/* ---------- Sesión ---------- */
function find_user(int $id): ?array
{
    $q = db()->prepare('SELECT * FROM users WHERE id = ?');
    $q->execute([$id]);
    return $q->fetch() ?: null;
}

function require_user(): array
{
    $u = isset($_SESSION['uid']) ? find_user((int) $_SESSION['uid']) : null;
    if (!$u) {
        throw new ApiException('Tu sesión ha finalizado. Inicia sesión de nuevo.', 401);
    }
    return $u;
}

function public_user(array $u): array
{
    return [
        'id' => (string) $u['id'], 'nombre' => $u['nombre'], 'codigo' => $u['codigo'], 'correo' => $u['correo'],
        'programa' => $u['programa'] ?? '', 'semestre' => $u['semestre'] !== null ? (int) $u['semestre'] : null,
        'telefono' => $u['telefono'] ?? '', 'foto' => $u['foto'] ?? '', 'creado' => $u['creado'], 'demo' => (bool) $u['es_demo'],
    ];
}

/* ---------- Validaciones (equivalentes a js/validators.js) ---------- */
function v_nombre(string $v): string
{
    $v = trim($v);
    if ($v === '') return 'Escribe tu nombre completo.';
    if (!preg_match("/^[\p{L}' ]+$/u", $v)) return 'El nombre solo puede contener letras y espacios.';
    if (count(preg_split('/\s+/', $v)) < 2) return 'Escribe al menos un nombre y un apellido.';
    if (mb_strlen($v) > 80) return 'El nombre es demasiado largo.';
    return '';
}

function v_correo(string $v): string
{
    $v = trim($v);
    if ($v === '') return 'Escribe tu correo institucional.';
    if (!filter_var($v, FILTER_VALIDATE_EMAIL)) return 'El formato del correo no es válido.';
    if (!preg_match('/^[a-z0-9._%+-]+@' . preg_quote(DOMINIO_CORREO, '/') . '$/i', $v)) return 'Usa tu correo institucional @' . DOMINIO_CORREO . '.';
    return '';
}

function v_codigo(string $v): string
{
    return preg_match('/^U00\d{6}$/i', trim($v)) ? '' : 'El código debe tener el formato U00 seguido de 6 dígitos (ej.: U00123456).';
}

function v_telefono(string $v): string
{
    $v = preg_replace('/\s/', '', $v);
    return $v === '' || preg_match('/^3\d{9}$/', $v) ? '' : 'Escribe un celular colombiano de 10 dígitos que inicie en 3.';
}

function v_semestre($v): string
{
    if ($v === '' || $v === null) return '';
    $n = (int) $v;
    return $n >= 1 && $n <= 12 ? '' : 'Selecciona un semestre válido.';
}

/** Nivel de seguridad de la contraseña: 1 débil, 2 media, 3 fuerte (F09). */
function password_level(string $p): int
{
    if ($p === '') return 0;
    $r = [
        'length' => mb_strlen($p) >= 8,
        'upper' => (bool) preg_match('/\p{Lu}/u', $p),
        'lower' => (bool) preg_match('/\p{Ll}/u', $p),
        'number' => (bool) preg_match('/\d/', $p),
        'special' => (bool) preg_match('/[^\p{L}\d]/u', $p),
    ];
    $score = count(array_filter($r)) + (mb_strlen($p) >= 12 ? 1 : 0);
    if (!$r['length'] || $score <= 3) return 1;
    if ($score === 4 || !($r['upper'] && $r['lower'] && $r['number'] && $r['special'])) return 2;
    return 3;
}

function validate_register(array $d): void
{
    $err = v_nombre((string) ($d['nombre'] ?? '')) ?: v_codigo((string) ($d['codigo'] ?? '')) ?: v_correo((string) ($d['correo'] ?? ''))
        ?: (password_level((string) ($d['password'] ?? '')) < 3 ? 'La contraseña debe ser fuerte: cumple todos los requisitos.' : '')
        ?: v_telefono((string) ($d['telefono'] ?? '')) ?: v_semestre($d['semestre'] ?? null)
        ?: (mb_strlen((string) ($d['programa'] ?? '')) > 100 ? 'El nombre del programa es demasiado largo.' : '');
    if ($err) throw new ApiException($err);
    if (empty($d['acepta'])) throw new ApiException('Debes aceptar la política de tratamiento de datos personales.');
}

function validate_profile(array $d): void
{
    $err = v_nombre((string) ($d['nombre'] ?? '')) ?: v_telefono((string) ($d['telefono'] ?? '')) ?: v_semestre($d['semestre'] ?? null)
        ?: (mb_strlen((string) ($d['programa'] ?? '')) > 100 ? 'El nombre del programa es demasiado largo.' : '');
    if ($err) throw new ApiException($err);
}

function validate_class(array $c): void
{
    if (mb_strlen($c['materia']) < 2) throw new ApiException('Escribe el nombre de la asignatura.');
    if ($c['dia'] < 1 || $c['dia'] > 6) throw new ApiException('Selecciona un día válido.');
    if (!preg_match('/^\d{2}:\d{2}$/', $c['inicio']) || !preg_match('/^\d{2}:\d{2}$/', $c['fin'])) throw new ApiException('Las horas no son válidas.');
    if (to_min($c['fin']) <= to_min($c['inicio'])) throw new ApiException('La hora de fin debe ser posterior a la de inicio.');
    if (to_min($c['inicio']) < 6 * 60 || to_min($c['fin']) > 20 * 60) throw new ApiException('El horario debe estar entre 6:00 y 20:00.');
}

function clean_name(string $v): string { return preg_replace('/\s+/', ' ', trim($v)); }
function int_or_null($v): ?int { return ($v === '' || $v === null) ? null : (int) $v; }

/* ---------- Reglas de horario ---------- */
function to_min(string $hhmm): int { [$h, $m] = array_map('intval', explode(':', $hhmm)); return $h * 60 + $m; }
function overlaps(string $a1, string $a2, string $b1, string $b2): bool { return to_min($a1) < to_min($b2) && to_min($b1) < to_min($a2); }

/** ¿La actividad aún admite inscripciones? (no ha empezado) */
function is_upcoming(array $ev): bool
{
    $t = date('Y-m-d');
    return $ev['fecha'] > $t || ($ev['fecha'] === $t && to_min($ev['inicio']) > ((int) date('G') * 60 + (int) date('i')));
}

/* ---------- Mapeos ---------- */

/** Actividades con cupos y estado del usuario (igual que LocalBackend.eventsFor). */
function all_events(int $userId): array
{
    $pdo = db();
    $places = [];
    foreach ($pdo->query('SELECT * FROM places')->fetchAll() as $p) $places[$p['id']] = $p;
    $used = [];
    foreach ($pdo->query("SELECT event_id, COUNT(*) n FROM enrollments WHERE estado <> 'cancelada' GROUP BY event_id")->fetchAll() as $r) $used[$r['event_id']] = (int) $r['n'];
    $mine = [];
    $q = $pdo->prepare("SELECT id, event_id, estado FROM enrollments WHERE user_id = ? AND estado <> 'cancelada' ORDER BY id");
    $q->execute([$userId]);
    foreach ($q->fetchAll() as $r) $mine[$r['event_id']] = $r;
    return array_map(function ($e) use ($places, $used, $mine) {
        $p = $places[$e['place_id']] ?? [];
        $u = $used[$e['id']] ?? 0;
        return [
            'id' => $e['id'], 'titulo' => $e['titulo'], 'categoria' => $e['categoria'], 'modalidad' => $e['modalidad'], 'placeId' => $e['place_id'],
            'fecha' => $e['fecha'], 'inicio' => $e['inicio'], 'fin' => $e['fin'], 'horas' => (int) $e['horas'],
            'cuposTotales' => (int) $e['cupos_totales'], 'ocupadosBase' => (int) $e['ocupados_base'],
            'descripcion' => $e['descripcion'], 'fuente' => $e['fuente'], 'demo' => (bool) $e['es_demo'], 'notaHoras' => $e['nota_horas'],
            'lugar' => $p['nombre'] ?? '', 'ubicacion' => $p['ubicacion'] ?? '', 'imagen' => $p['imagen'] ?? '', 'campus' => $p['campus'] ?? null,
            'inscritos' => $u, 'cuposDisponibles' => max(0, (int) $e['cupos_totales'] - (int) $e['ocupados_base'] - $u),
            'miEstado' => isset($mine[$e['id']]) ? $mine[$e['id']]['estado'] : null,
            'miInscripcion' => isset($mine[$e['id']]) ? (string) $mine[$e['id']]['id'] : null,
        ];
    }, $pdo->query('SELECT * FROM events ORDER BY fecha, inicio')->fetchAll());
}

/** F03 — Lugares con cupos = suma de cupos libres de sus próximas actividades. */
function all_places(int $userId): array
{
    $evs = array_values(array_filter(all_events($userId), 'is_upcoming'));
    return array_map(function ($p) use ($evs) {
        $mine = array_values(array_filter($evs, fn ($e) => $e['placeId'] === $p['id']));
        return [
            'id' => $p['id'], 'nombre' => $p['nombre'], 'categoria' => $p['categoria'], 'descripcion' => $p['descripcion'],
            'ubicacion' => $p['ubicacion'], 'imagen' => $p['imagen'], 'campus' => $p['campus'],
            'mapa' => $p['mapa_x'] !== null ? ['x' => (float) $p['mapa_x'], 'y' => (float) $p['mapa_y']] : null,
            'proximas' => array_map(fn ($e) => ['id' => $e['id'], 'titulo' => $e['titulo'], 'fecha' => $e['fecha'], 'inicio' => $e['inicio'], 'fin' => $e['fin'],
                'horas' => $e['horas'], 'modalidad' => $e['modalidad'], 'cuposDisponibles' => $e['cuposDisponibles'], 'miEstado' => $e['miEstado']], $mine),
            'cuposTotales' => array_sum(array_column($mine, 'cuposTotales')),
            'cuposDisponibles' => array_sum(array_column($mine, 'cuposDisponibles')),
            'horasMax' => $mine ? max(array_column($mine, 'horas')) : 0,
        ];
    }, db()->query('SELECT * FROM places ORDER BY orden')->fetchAll());
}

function map_enrollment(array $en, array $ev): array
{
    return [
        'id' => (string) $en['id'], 'eventId' => $en['event_id'], 'estado' => $en['estado'], 'qr' => $en['qr'] ?? '', 'creado' => $en['creado'],
        'titulo' => $ev['titulo'] ?? '', 'categoria' => $ev['categoria'] ?? '', 'modalidad' => $ev['modalidad'] ?? '', 'placeId' => $ev['placeId'] ?? '',
        'lugar' => $ev['lugar'] ?? '', 'ubicacion' => $ev['ubicacion'] ?? '', 'fecha' => $ev['fecha'] ?? '', 'inicio' => $ev['inicio'] ?? '',
        'fin' => $ev['fin'] ?? '', 'horas' => $ev['horas'] ?? 0, 'fuente' => $ev['fuente'] ?? null, 'demo' => $ev['demo'] ?? false,
    ];
}

function events_by_id(int $userId): array
{
    $out = [];
    foreach (all_events($userId) as $e) $out[$e['id']] = $e;
    return $out;
}

/** Inscripción cruda del usuario (o error 404). */
function find_enrollment_row(int $id, int $userId): array
{
    $q = db()->prepare('SELECT * FROM enrollments WHERE id = ? AND user_id = ?');
    $q->execute([$id, $userId]);
    $e = $q->fetch();
    if (!$e) throw new ApiException('La inscripción no existe.', 404);
    return $e;
}

function find_enrollment(int $id, int $userId): array
{
    $en = find_enrollment_row($id, $userId);
    return map_enrollment($en, events_by_id($userId)[$en['event_id']] ?? []);
}

function map_class(array $c): array
{
    return ['id' => (string) $c['id'], 'userId' => (string) $c['user_id'], 'dia' => (int) $c['dia'], 'inicio' => $c['inicio'], 'fin' => $c['fin'], 'materia' => $c['materia'], 'salon' => $c['salon'] ?? ''];
}
