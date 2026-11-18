/* ==========================================================================
   Configuración general de UNAB Campus HL
   --------------------------------------------------------------------------
   Horas Libres requeridas: 48 horas (valor indicado por el grupo del
   proyecto). Con backend PHP se usa php/config.php (deben coincidir).
   ========================================================================== */

const CONFIG = Object.freeze({
  APP_NAME: 'UNAB Campus HL',

  /** Total de Horas Libres requeridas. */
  HL_REQUERIDAS: 48,
  HL_REQUERIDAS_ES_DEMO: false,

  /** Enlaces institucionales (MiPortalU y servicios). */
  LINKS: {
    miportalu: 'https://miportalu.unab.edu.co/modulos/inicio/index.php',
    noticiasMiPortalU: 'https://miportalu.unab.edu.co/modulos/inicio/notipagprincipal.php',
    noticiasUnab: 'https://unab.edu.co/category/eventos/',
    bienestar: 'https://bienestar.unab.edu.co/',
    correo: 'https://mail.google.com/a/unab.edu.co',
    cosmos: 'https://cosmos.unab.edu.co/',
    biblioteca: 'https://sibu.unab.edu.co/',
    unabDigital: 'https://unabdigital.unab.edu.co/',
    pagos: 'https://miportalu.unab.edu.co/modulos/recaudoServicios/pagoServicios.php',
    registroHL: 'https://unab.edu.co/esta-es-la-nueva-forma-en-que-debes-registrar-tus-horas-libres',
  },

  /** Dominio de correo institucional admitido. */
  DOMINIO_CORREO: 'unab.edu.co',

  /**
   * Backend de datos:
   *  'auto'  → usa php/api.php si responde (servidor PHP activo); si no, localStorage.
   *  'php'   → fuerza el backend PHP.
   *  'local' → fuerza localStorage (solo en este navegador, sin servidor).
   */
  BACKEND: 'auto',
  API_URL: 'php/api.php',


  /** Rango horario mostrado en el horario semanal. */
  HORARIO_INICIO: 6,
  HORARIO_FIN: 20,
});
