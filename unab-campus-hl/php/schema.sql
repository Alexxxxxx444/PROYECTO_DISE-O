-- ==========================================================================
-- UNAB Campus HL — Esquema MySQL / MariaDB (XAMPP, WAMP, Laragon)
-- --------------------------------------------------------------------------
-- 1. Importe este archivo en phpMyAdmin.
-- 2. En php/config.php cambie DB_DRIVER a 'mysql' y ajuste las credenciales.
-- 3. Los lugares, la agenda de actividades y el usuario demo se insertan automáticamente
--    desde php/seed.json la primera vez que se usa la API (tabla places vacía).
-- Fechas relativas a la semana actual; cupos y posiciones en el plano: demo.
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS campus_hl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campus_hl;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80)  NOT NULL,
  codigo        CHAR(9)      NOT NULL UNIQUE,          -- Formato U00 + 6 dígitos
  correo        VARCHAR(120) NOT NULL UNIQUE,          -- Dominio @unab.edu.co
  password_hash VARCHAR(255) NOT NULL,                 -- password_hash() de PHP
  programa      VARCHAR(100) DEFAULT '',
  semestre      TINYINT      NULL,
  telefono      VARCHAR(15)  DEFAULT '',
  foto          MEDIUMTEXT   NULL,                     -- Imagen en base64 (máx. ~500 KB)
  es_demo       TINYINT(1)   NOT NULL DEFAULT 0,
  creado        DATE         NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS places (
  id          VARCHAR(30)  PRIMARY KEY,
  nombre      VARCHAR(80)  NOT NULL,
  categoria   VARCHAR(30)  NOT NULL,                   -- Cultura | Deporte | Salud | Cafetería | Virtual
  descripcion TEXT         NOT NULL,
  ubicacion   VARCHAR(150) NOT NULL,
  imagen      VARCHAR(200) NOT NULL,
  campus      VARCHAR(20)  NULL,                       -- Plano: 'jardin' | 'csu' | NULL (virtual)
  mapa_x      DECIMAL(5,2) NULL,                       -- Posición en % del plano
  mapa_y      DECIMAL(5,2) NULL,
  orden       TINYINT      NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Agenda de actividades de Bienestar (válidas por Horas Libres)
CREATE TABLE IF NOT EXISTS events (
  id            VARCHAR(10)  PRIMARY KEY,
  titulo        VARCHAR(160) NOT NULL,
  categoria     VARCHAR(30)  NOT NULL,                 -- Cultura | Deporte | Salud | Desarrollo humano
  modalidad     ENUM('presencial','virtual') NOT NULL,
  place_id      VARCHAR(30)  NOT NULL,
  fecha         DATE         NOT NULL,
  inicio        CHAR(5)      NOT NULL,
  fin           CHAR(5)      NOT NULL,
  horas         TINYINT      NOT NULL,                 -- Horas libres que otorga
  cupos_totales SMALLINT     NOT NULL,
  ocupados_base SMALLINT     NOT NULL DEFAULT 0,       -- Cupos ocupados por otros (demo)
  descripcion   TEXT         NULL,
  fuente        VARCHAR(255) NULL,                     -- URL de la publicación UNAB
  es_demo       TINYINT(1)   NOT NULL DEFAULT 0,
  nota_horas    VARCHAR(255) DEFAULT '',
  INDEX idx_ev_fecha (fecha),
  CONSTRAINT fk_ev_place FOREIGN KEY (place_id) REFERENCES places(id)
) ENGINE=InnoDB;

-- Estados: inscrita → asistencia (QR escaneado / asistencia confirmada) → completada (encuesta) | cancelada
CREATE TABLE IF NOT EXISTS enrollments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  event_id     VARCHAR(10)  NOT NULL,
  estado       ENUM('inscrita','asistencia','completada','cancelada') NOT NULL DEFAULT 'inscrita',
  qr           VARCHAR(20)  DEFAULT '',
  encuesta     TEXT         NULL,                      -- Respuestas (JSON)
  creado       DATE         NOT NULL,
  cancelada_el DATE         NULL,
  INDEX idx_enr_user (user_id),
  INDEX idx_enr_event (event_id, estado),
  CONSTRAINT fk_enr_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_enr_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS history (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT          NOT NULL,
  event_id  VARCHAR(10)  NULL,
  titulo    VARCHAR(160) NOT NULL,
  categoria VARCHAR(30)  NOT NULL,
  place_id  VARCHAR(30)  NOT NULL,
  fecha     DATE         NOT NULL,
  inicio    CHAR(5)      NOT NULL,
  fin       CHAR(5)      NOT NULL,
  horas     TINYINT      NOT NULL,
  INDEX idx_hist_user (user_id),
  CONSTRAINT fk_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS classes (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT          NOT NULL,
  dia     TINYINT      NOT NULL,                       -- 1 lunes … 6 sábado
  inicio  CHAR(5)      NOT NULL,
  fin     CHAR(5)      NOT NULL,
  materia VARCHAR(80)  NOT NULL,
  salon   VARCHAR(40)  DEFAULT '',
  INDEX idx_class_user (user_id),
  CONSTRAINT fk_class_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
