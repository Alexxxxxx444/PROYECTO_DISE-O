/* ==========================================================================
   Iconografía: set propio de íconos de trazo uniforme (2 px, 24×24)
   Uso: icon('home') → string SVG accesible (aria-hidden)
   ========================================================================== */

const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  listCheck: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  map: '<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  check: '<path d="M5 12.5 10 17.5 19.5 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  idCard: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14.5 10h4M14.5 13.5h3"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
  coffee: '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16M7 2.5v2.5M10.5 2.5v2.5M14 2.5v2.5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.8 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14 -1.5 7.5L12 19l5 2.5-1.5-7.5"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .8 3.5 2.8 3.5 5.7"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7.5V12l3 2"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  filter: '<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
};

/**
 * Íconos de la familia iconográfica oficial UNAB (js/unab-icons.js).
 * Cuando un nombre tiene equivalente en el manual de marca, se usa el ícono
 * institucional; los glifos de interfaz sin equivalente (menú, cerrar,
 * flechas pequeñas, ojo…) usan el set de trazo propio.
 */
const UNAB_ALIAS = {
  home: 'house', clock: 'clock', pin: 'pin', book: 'book', file: 'document', printer: 'printer',
  search: 'search', info: 'info', mail: 'mail', phone: 'phone', coffee: 'coffee', dumbbell: 'dumbbell',
  award: 'ribbon', camera: 'camera', heart: 'heart', trash: 'trash', edit: 'pencil', sun: 'sun',
  palette: 'artist', user: 'student', bell: 'bell', ticket: 'certificate', listCheck: 'notepad',
  // nombres directos del manual
  house: 'house', student: 'student', notepad: 'notepad', heartPulse: 'heartPulse', cross: 'cross',
  stethoscope: 'stethoscope', trophy: 'trophy', ball: 'ball', music: 'music', mic: 'mic', food: 'food',
  drop: 'drop', artist: 'artist', laptop: 'laptop', graduation: 'graduation', globe: 'globe',
  certificate: 'certificate', ribbon: 'ribbon', bulb: 'bulb', chat: 'chat', headphones: 'headphones',
  recycle: 'recycle', pencil: 'pencil', bicycle: 'bicycle', gears: 'gears', stage: 'stage', card: 'card',
  bus: 'bus', paw: 'paw', wheelchair: 'wheelchair', headset: 'headset', document: 'document',
};

/**
 * Devuelve el marcado SVG de un ícono.
 * @param {string} name  Nombre del ícono en ICON_PATHS
 * @param {string} cls   Clases CSS
 */
function icon(name, cls = 'icon') {
  const u = typeof UNAB_ICONS !== 'undefined' && UNAB_ALIAS[name] && UNAB_ICONS[UNAB_ALIAS[name]];
  if (u) return `<svg class="${cls} uicon" viewBox="0 0 100 100" fill="currentColor" fill-rule="evenodd" aria-hidden="true" focusable="false"><path d="${u}"/></svg>`;
  const p = ICON_PATHS[name] || ICON_PATHS.info;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}

/**
 * Patrón gráfico de "módulos" inspirado en el sistema gráfico del manual UNAB
 * (triángulos = visión global, círculos = adaptabilidad, líneas = dinamismo,
 * cuadrados = confianza). Se dibuja con currentColor.
 */
function brandPattern(cols = 4, rows = 4) {
  const s = 60; let out = '';
  const mods = [
    (x, y) => `<path d="M${x + 6} ${y + 46}h48L${x + 30} ${y + 14}z"/>`,
    (x, y) => `<circle cx="${x + 30}" cy="${y + 30}" r="22"/><rect x="${x + 20}" y="${y + 20}" width="20" height="20" fill="var(--pattern-bg, transparent)"/>`,
    (x, y) => `<rect x="${x + 10}" y="${y + 8}" width="7" height="44"/><rect x="${x + 26}" y="${y + 8}" width="7" height="44"/><rect x="${x + 42}" y="${y + 8}" width="7" height="44"/>`,
    (x, y) => `<rect x="${x + 8}" y="${y + 10}" width="44" height="7"/><rect x="${x + 8}" y="${y + 26}" width="44" height="7"/><rect x="${x + 8}" y="${y + 42}" width="44" height="7"/>`,
    (x, y) => `<path d="M${x + 8} ${y + 8}h44v22a22 22 0 0 1-44 0z"/>`,
  ];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out += mods[(r * 2 + c) % mods.length](c * s, r * s);
  return `<svg viewBox="0 0 ${cols * s} ${rows * s}" fill="currentColor" aria-hidden="true">${out}</svg>`;
}
