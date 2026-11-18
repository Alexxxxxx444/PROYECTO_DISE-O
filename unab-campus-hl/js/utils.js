/* ==========================================================================
   Utilidades generales: fechas, formato, seguridad de texto, hash
   ========================================================================== */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escapa texto para insertarlo de forma segura en HTML. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Fecha local en formato YYYY-MM-DD. */
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayISO() { return toISODate(new Date()); }
function parseISODate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function formatDate(iso, opts = {}) {
  const d = parseISODate(iso);
  if (opts.short) return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
  const base = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  return opts.weekday ? `${DIAS[d.getDay()]}, ${base}` : base;
}
function formatLongToday() {
  const d = new Date();
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "HH:MM" → minutos desde medianoche. */
function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function fromMinutes(min) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }
function formatHour(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suf = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suf}`;
}
function formatRange(a, b) { return `${formatHour(a)} – ${formatHour(b)}`; }

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }
function plural(n, s, p) { return `${n} ${n === 1 ? s : p}`; }
function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
function uid(prefix = 'id') { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }

function getParam(name) { return new URLSearchParams(location.search).get(name); }

/**
 * SHA-256 en JavaScript puro (funciona también al abrir los archivos con file://,
 * donde crypto.subtle no siempre está disponible). Se usa únicamente en el modo
 * de almacenamiento local de demostración; el backend PHP usa password_hash().
 */
function sha256(ascii) {
  const rightRotate = (v, a) => (v >>> a) | (v << (32 - a));
  const maxWord = 2 ** 32; let result = ''; const words = []; const hash = []; const k = [];
  let primeCounter = 0; const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (candidate ** 0.5 * maxWord) | 0;
      k[primeCounter++] = (candidate ** (1 / 3) * maxWord) | 0;
    }
  }
  ascii = unescape(encodeURIComponent(ascii));
  const asciiBitLength = ascii.length * 8;
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  let H = hash.slice(0, 8);
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16)); const oldHash = H;
    H = H.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]; const a = H[0], e = H[4];
      const temp1 = H[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & H[5]) ^ (~e & H[6])) + k[i] +
        (w[i] = i < 16 ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
      H = [(temp1 + temp2) | 0].concat(H); H[4] = (H[4] + temp1) | 0; H.length = 8;
    }
    for (let i = 0; i < 8; i++) H[i] = (H[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (H[i] >> (j * 8)) & 255; result += (b < 16 ? '0' : '') + b.toString(16); }
  return result;
}
