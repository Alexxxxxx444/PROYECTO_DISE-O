<?php
/* ==========================================================================
   UNAB Campus HL — API JSON
   --------------------------------------------------------------------------
   Uso: POST php/api.php?action=<accion>  (cuerpo JSON)
   Respuesta: { "ok": true, "data": {...} }  |  { "ok": false, "error": "..." }
   Las acciones y respuestas coinciden con LocalBackend (js/api.js).
   ========================================================================== */

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
session_start();

$action = $_GET['action'] ?? '';
$raw = file_get_contents('php://input') ?: '';
$in = json_decode($raw, true);
if (!is_array($in)) {
    $in = [];
}

try {
    if ($action !== 'ping' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new ApiException('Método no permitido.', 405);
    }
    $data = handle($action, $in);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (ApiException $e) {
    http_response_code($e->getCode() ?: 400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[CampusHL] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error interno del servidor.'], JSON_UNESCAPED_UNICODE);
}

function handle(string $action, array $d): array
{
    $pdo = db();

    switch ($action) {
        case 'ping':
            return ['backend' => 'php', 'driver' => DB_DRIVER];

        case 'register': {
            validate_register($d);
            $correo = strtolower(trim($d['correo']));
            $codigo = strtoupper(trim($d['codigo']));
            $q = $pdo->prepare('SELECT correo, codigo FROM users WHERE correo = ? OR codigo = ?');
            $q->execute([$correo, $codigo]);
            foreach ($q->fetchAll() as $row) {
                if ($row['correo'] === $correo) throw new ApiException('Ya existe una cuenta registrada con este correo institucional.', 409);
                throw new ApiException('Ya existe una cuenta registrada con este código estudiantil.', 409);
            }
            $pdo->prepare('INSERT INTO users (nombre, codigo, correo, password_hash, programa, semestre, telefono, foto, es_demo, creado) VALUES (?,?,?,?,?,?,?,?,0,?)')
                ->execute([clean_name($d['nombre']), $codigo, $correo, password_hash((string) $d['password'], PASSWORD_DEFAULT),
                    trim((string) ($d['programa'] ?? '')), int_or_null($d['semestre'] ?? null), trim((string) ($d['telefono'] ?? '')), '', date('Y-m-d')]);
            return ['user' => public_user(find_user((int) $pdo->lastInsertId()))];
        }

        case 'login': {
            $q = $pdo->prepare('SELECT * FROM users WHERE correo = ?');
            $q->execute([strtolower(trim((string) ($d['correo'] ?? '')))]);
            $u = $q->fetch();
            if (!$u || !password_verify((string) ($d['password'] ?? ''), $u['password_hash'])) {
                throw new ApiException('Correo o contraseña incorrectos.', 401);
            }
            session_regenerate_id(true);
            $_SESSION['uid'] = (int) $u['id'];
            if (!empty($d['remember'])) {
                $p = session_get_cookie_params();
                setcookie(session_name(), session_id(), ['expires' => time() + 60 * 60 * 24 * 30, 'path' => $p['path'], 'httponly' => true, 'samesite' => 'Lax']);
            }
            return ['user' => public_user($u)];
        }

        case 'resetPassword': {
            $q = $pdo->prepare('SELECT id FROM users WHERE correo = ? AND codigo = ?');
            $q->execute([strtolower(trim((string) ($d['correo'] ?? ''))), strtoupper(trim((string) ($d['codigo'] ?? '')))]);
            $id = $q->fetchColumn();
            if (!$id) throw new ApiException('El correo y el código estudiantil no coinciden con ninguna cuenta.', 404);
            if (password_level((string) ($d['nueva'] ?? '')) < 3) throw new ApiException('La nueva contraseña no cumple los requisitos de seguridad.');
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $d['nueva'], PASSWORD_DEFAULT), $id]);
            return ['ok' => true];
        }

        case 'logout':
            $_SESSION = [];
            session_destroy();
            setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/']);
            return ['ok' => true];

        case 'me': {
            // Sin sesión se responde 200 con user = null (evita errores 401 en la consola)
            $u = isset($_SESSION['uid']) ? find_user((int) $_SESSION['uid']) : null;
            return ['user' => $u ? public_user($u) : null];
        }

        case 'updateProfile': {
            $u = require_user();
            validate_profile($d);
            $foto = (string) ($d['foto'] ?? '');
            if ($foto !== '' && (!preg_match('#^data:image/(png|jpe?g|webp);base64,#', $foto) || strlen($foto) > 700000)) {
                throw new ApiException('La foto no es válida o es demasiado grande.');
            }
            $pdo->prepare('UPDATE users SET nombre = ?, programa = ?, semestre = ?, telefono = ?, foto = ? WHERE id = ?')
                ->execute([clean_name($d['nombre']), trim((string) ($d['programa'] ?? '')), int_or_null($d['semestre'] ?? null), trim((string) ($d['telefono'] ?? '')), $foto, $u['id']]);
            return ['user' => public_user(find_user((int) $u['id']))];
        }

        case 'changePassword': {
            $u = require_user();
            if (!password_verify((string) ($d['actual'] ?? ''), $u['password_hash'])) throw new ApiException('La contraseña actual no es correcta.');
            if (password_level((string) ($d['nueva'] ?? '')) < 3) throw new ApiException('La nueva contraseña no cumple los requisitos de seguridad.');
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $d['nueva'], PASSWORD_DEFAULT), $u['id']]);
            return ['ok' => true];
        }

        case 'deleteAccount': {
            $u = require_user();
            if (!password_verify((string) ($d['password'] ?? ''), $u['password_hash'])) throw new ApiException('La contraseña no es correcta.');
            $pdo->beginTransaction();
            foreach (['enrollments', 'history', 'classes'] as $t) {
                $pdo->prepare("DELETE FROM $t WHERE user_id = ?")->execute([$u['id']]);
            }
            $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$u['id']]);
            $pdo->commit();
            $_SESSION = [];
            session_destroy();
            return ['ok' => true];
        }

        case 'places': {
            $u = require_user();
            return ['places' => all_places((int) $u['id'])];
        }

        case 'events': {
            $u = require_user();
            return ['events' => all_events((int) $u['id'])];
        }

        case 'enrollments': {
            $u = require_user();
            $evs = events_by_id((int) $u['id']);
            $q = $pdo->prepare('SELECT * FROM enrollments WHERE user_id = ?');
            $q->execute([$u['id']]);
            $list = array_map(fn ($en) => map_enrollment($en, $evs[$en['event_id']] ?? []), $q->fetchAll());
            usort($list, fn ($a, $b) => strcmp($b['fecha'] . $b['inicio'], $a['fecha'] . $a['inicio']));
            return ['enrollments' => $list];
        }

        case 'enroll': {
            $u = require_user();
            $uidInt = (int) $u['id'];
            $pdo->beginTransaction();
            try {
                // Se recalcula dentro de la transacción para evitar sobrecupo
                $evs = events_by_id($uidInt);
                $ev = $evs[(string) ($d['eventId'] ?? '')] ?? null;
                if (!$ev) throw new ApiException('La actividad seleccionada no existe.', 404);
                if (!is_upcoming($ev)) throw new ApiException('La inscripción a esta actividad ya cerró.');
                if ($ev['miEstado']) throw new ApiException('Ya estás inscrito en esta actividad.', 409);
                if ($ev['cuposDisponibles'] <= 0) throw new ApiException("No hay cupos disponibles para “{$ev['titulo']}”.", 409);
                $q = $pdo->prepare("SELECT event_id FROM enrollments WHERE user_id = ? AND estado IN ('inscrita','asistencia')");
                $q->execute([$uidInt]);
                foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $eid) {
                    $o = $evs[$eid] ?? null;
                    if ($o && $o['fecha'] === $ev['fecha'] && overlaps($o['inicio'], $o['fin'], $ev['inicio'], $ev['fin'])) {
                        throw new ApiException("Se cruza con “{$o['titulo']}” ({$o['inicio']}–{$o['fin']}).", 409);
                    }
                }
                $pdo->prepare("INSERT INTO enrollments (user_id, event_id, estado, creado) VALUES (?,?,'inscrita',?)")->execute([$uidInt, $ev['id'], date('Y-m-d')]);
                $id = (int) $pdo->lastInsertId();
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
            return ['enrollment' => find_enrollment($id, $uidInt)];
        }

        case 'cancel': {
            $u = require_user();
            $en = find_enrollment_row((int) ($d['id'] ?? 0), (int) $u['id']);
            if ($en['estado'] !== 'inscrita') throw new ApiException('Solo se pueden cancelar inscripciones que aún no tienen asistencia registrada.');
            $pdo->prepare("UPDATE enrollments SET estado = 'cancelada', cancelada_el = ? WHERE id = ?")->execute([date('Y-m-d'), $en['id']]);
            return ['enrollment' => find_enrollment((int) $en['id'], (int) $u['id'])];
        }

        case 'qr': {
            $u = require_user();
            $en = find_enrollment((int) ($d['id'] ?? 0), (int) $u['id']);
            if ($en['modalidad'] !== 'presencial') throw new ApiException('Las actividades virtuales se registran con “Confirmar asistencia”.');
            if ($en['estado'] !== 'inscrita') throw new ApiException('Esta inscripción no está activa.');
            if ($en['qr'] === '') {
                $code = 'HL-' . strtoupper(substr(hash('sha256', $u['codigo'] . '|' . $en['id'] . '|' . random_bytes(4)), 0, 10));
                $pdo->prepare('UPDATE enrollments SET qr = ? WHERE id = ?')->execute([$code, $en['id']]);
            }
            return ['enrollment' => find_enrollment((int) $en['id'], (int) $u['id'])];
        }

        case 'attend': {
            $u = require_user();
            $en = find_enrollment((int) ($d['id'] ?? 0), (int) $u['id']);
            if ($en['estado'] !== 'inscrita') throw new ApiException('Esta inscripción no está activa.');
            if ($en['fecha'] > date('Y-m-d')) throw new ApiException('La asistencia se registra el día de la actividad.');
            if ($en['modalidad'] === 'presencial' && $en['qr'] === '') throw new ApiException('Primero genera tu código QR.');
            $pdo->prepare("UPDATE enrollments SET estado = 'asistencia' WHERE id = ?")->execute([$en['id']]);
            return ['enrollment' => find_enrollment((int) $en['id'], (int) $u['id'])];
        }

        case 'survey': {
            $u = require_user();
            $en = find_enrollment((int) ($d['id'] ?? 0), (int) $u['id']);
            if ($en['estado'] !== 'asistencia') throw new ApiException('La encuesta se responde después de registrar la asistencia.');
            $r = $d['respuestas'] ?? null;
            if (!is_array($r)) throw new ApiException('Responde la encuesta.');
            for ($i = 1; $i <= 5; $i++) {
                $v = (int) ($r["p$i"] ?? 0);
                if ($v < 1 || $v > 5) throw new ApiException('Responde las preguntas de calificación.');
            }
            if (!in_array($r['p6'] ?? '', ['si', 'no'], true)) throw new ApiException('Indica si recomendarías la actividad.');
            $r['comentario'] = mb_substr((string) ($r['comentario'] ?? ''), 0, 300);
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE enrollments SET estado = 'completada', encuesta = ? WHERE id = ?")->execute([json_encode($r, JSON_UNESCAPED_UNICODE), $en['id']]);
            $pdo->prepare('INSERT INTO history (user_id, event_id, titulo, categoria, place_id, fecha, inicio, fin, horas) VALUES (?,?,?,?,?,?,?,?,?)')
                ->execute([$u['id'], $en['eventId'], $en['titulo'], $en['categoria'], $en['placeId'], $en['fecha'], $en['inicio'], $en['fin'], $en['horas']]);
            $pdo->commit();
            return ['enrollment' => find_enrollment((int) $en['id'], (int) $u['id'])];
        }

        case 'news':
            require_user();
            require_once __DIR__ . '/news.php';
            return fetch_unab_news((string) ($d['q'] ?? ''));

        case 'history': {
            $u = require_user();
            $q = $pdo->prepare('SELECT h.*, p.nombre AS lugar FROM history h LEFT JOIN places p ON p.id = h.place_id WHERE h.user_id = ? ORDER BY h.fecha DESC, h.inicio DESC');
            $q->execute([$u['id']]);
            return ['history' => array_map(fn ($h) => [
                'id' => (string) $h['id'], 'eventId' => $h['event_id'], 'titulo' => $h['titulo'], 'categoria' => $h['categoria'], 'placeId' => $h['place_id'],
                'lugar' => $h['lugar'] ?? '', 'fecha' => $h['fecha'], 'inicio' => $h['inicio'], 'fin' => $h['fin'], 'horas' => (int) $h['horas'],
            ], $q->fetchAll())];
        }

        case 'summary': {
            $u = require_user();
            $q = $pdo->prepare('SELECT categoria, COALESCE(SUM(horas), 0) AS horas FROM history WHERE user_id = ? GROUP BY categoria');
            $q->execute([$u['id']]);
            $byCat = [];
            foreach ($q->fetchAll() as $r) $byCat[$r['categoria']] = (int) $r['horas'];
            $cumplidas = array_sum($byCat);
            $q = $pdo->prepare("SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND estado IN ('inscrita','asistencia')");
            $q->execute([$u['id']]);
            $req = HL_REQUERIDAS;
            return ['summary' => [
                'requeridas' => $req, 'requeridasDemo' => HL_REQUERIDAS_ES_DEMO, 'cumplidas' => $cumplidas,
                'pendientes' => max(0, $req - $cumplidas),
                'porcentaje' => $req ? (int) min(100, max(0, round($cumplidas / $req * 100))) : 0,
                'activas' => (int) $q->fetchColumn(),
                'porCategoria' => array_map(fn ($c) => ['categoria' => $c, 'horas' => $byCat[$c] ?? 0], ['Cultura', 'Deporte', 'Salud', 'Desarrollo humano']),
            ]];
        }

        case 'classes': {
            $u = require_user();
            $q = $pdo->prepare('SELECT * FROM classes WHERE user_id = ? ORDER BY dia, inicio');
            $q->execute([$u['id']]);
            return ['classes' => array_map('map_class', $q->fetchAll())];
        }

        case 'addClass': {
            $u = require_user();
            $c = ['dia' => (int) ($d['dia'] ?? 0), 'inicio' => (string) ($d['inicio'] ?? ''), 'fin' => (string) ($d['fin'] ?? ''),
                'materia' => trim((string) ($d['materia'] ?? '')), 'salon' => trim((string) ($d['salon'] ?? ''))];
            validate_class($c);
            $q = $pdo->prepare('SELECT * FROM classes WHERE user_id = ? AND dia = ?');
            $q->execute([$u['id'], $c['dia']]);
            foreach ($q->fetchAll() as $x) {
                if (overlaps($x['inicio'], $x['fin'], $c['inicio'], $c['fin'])) {
                    throw new ApiException("Se cruza con \"{$x['materia']}\" ({$x['inicio']}–{$x['fin']}).", 409);
                }
            }
            $pdo->prepare('INSERT INTO classes (user_id, dia, inicio, fin, materia, salon) VALUES (?,?,?,?,?,?)')
                ->execute([$u['id'], $c['dia'], $c['inicio'], $c['fin'], mb_substr($c['materia'], 0, 80), mb_substr($c['salon'], 0, 40)]);
            return ['class' => map_class(['id' => $pdo->lastInsertId(), 'user_id' => $u['id']] + $c)];
        }

        case 'deleteClass': {
            $u = require_user();
            $q = $pdo->prepare('DELETE FROM classes WHERE id = ? AND user_id = ?');
            $q->execute([(int) ($d['id'] ?? 0), $u['id']]);
            if ($q->rowCount() === 0) throw new ApiException('La clase no existe.', 404);
            return ['ok' => true];
        }

        case 'loadDemoClasses': {
            $u = require_user();
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM classes WHERE user_id = ?')->execute([$u['id']]);
            $ic = $pdo->prepare('INSERT INTO classes (user_id, dia, inicio, fin, materia, salon) VALUES (?,?,?,?,?,?)');
            foreach (demo_classes() as $c) {
                $ic->execute([$u['id'], ...$c]);
            }
            $pdo->commit();
            return ['ok' => true];
        }

        default:
            throw new ApiException("Acción desconocida: $action", 404);
    }
}
