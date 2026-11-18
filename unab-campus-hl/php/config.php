<?php
/* ==========================================================================
   UNAB Campus HL — Configuración del backend PHP
   ========================================================================== */

declare(strict_types=1);

/**
 * Horas Libres requeridas: 48 horas (valor indicado por el grupo del
 * proyecto). Debe coincidir con js/config.js.
 */
const HL_REQUERIDAS = 48;
const HL_REQUERIDAS_ES_DEMO = false;

/** Noticias en vivo: sitio público de la UNAB (WordPress) y minutos de caché. */
const NEWS_SITE = 'https://unab.edu.co';
const NEWS_CACHE_MINUTES = 15;

/** Dominio institucional permitido. */
const DOMINIO_CORREO = 'unab.edu.co';

/**
 * Base de datos.
 *  - 'sqlite': no requiere instalación; crea php/data/campus_hl.sqlite automáticamente.
 *  - 'mysql' : para XAMPP/WAMP. Importe primero php/schema.sql en phpMyAdmin.
 */
const DB_DRIVER = 'sqlite';
const DB_SQLITE_PATH = __DIR__ . '/data/campus_hl.sqlite';

const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'campus_hl';
const DB_USER = 'root';
const DB_PASS = '';

/** Zona horaria de Bucaramanga. */
date_default_timezone_set('America/Bogota');
