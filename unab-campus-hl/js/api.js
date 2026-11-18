/* ==========================================================================
   Capa de datos (API)
   --------------------------------------------------------------------------
   Todas las páginas usan API.call(accion, datos). Según CONFIG.BACKEND, la
   petición se resuelve con:
     • PhpBackend   → php/api.php (sesión PHP + base de datos SQLite/MySQL)
     • LocalBackend → localStorage del navegador (modo demostración; los datos
                      solo existen en este navegador, NO en un servidor).
   Ambos backends exponen exactamente las mismas acciones y respuestas.

   Flujo de Horas Libres (igual que MiPortalU):
     inscrita → (presencial: Generar código QR → escaneo en el evento |
                 virtual: Confirmar asistencia) → asistencia →
     Responder encuesta (6 preguntas) → completada (+ horas al historial)
   ========================================================================== */

class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/* ------------------------------------------------------------------------ */
/* Reglas de negocio compartidas (puras, sin almacenamiento)                */
/* ------------------------------------------------------------------------ */
const ESTADOS_ACTIVOS = ['inscrita', 'asistencia'];

const Rules = {
  overlaps(a1, a2, b1, b2) { return toMinutes(a1) < toMinutes(b2) && toMinutes(b1) < toMinutes(a2); },

  nowMinutes() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); },

  /** ¿La actividad aún admite inscripciones? (no ha empezado) */
  isUpcoming(ev) {
    const t = todayISO();
    return ev.fecha > t || (ev.fecha === t && toMinutes(ev.inicio) > Rules.nowMinutes());
  },

  /** ¿Ya se puede registrar la asistencia? (desde el día de la actividad) */
  canAttend(ev) { return ev.fecha <= todayISO(); },

  dayOf(iso) { return parseISODate(iso).getDay(); },

  /** Texto corto con las próximas actividades de un lugar. */
  scheduleText(place) {
    const next = (place.proximas || []).slice(0, 3);
    if (!next.length) return 'Sin actividades programadas';
    return next.map((e) => { const d = parseISODate(e.fecha); return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} · ${e.inicio}`; }).join('  ·  ');
  },

  /**
   * F07 — Sugerencias: actividades de los próximos 7 días con cupo, que no
   * se cruzan con clases ni con inscripciones activas.
   */
  suggestions(events, classes, enrollments, limit = 6) {
    const limitDate = toISODate(addDays(new Date(), 7));
    const active = enrollments.filter((e) => ESTADOS_ACTIVOS.includes(e.estado));
    return events.filter((ev) => Rules.isUpcoming(ev) && ev.fecha <= limitDate && ev.cuposDisponibles > 0 && !ev.miEstado)
      .filter((ev) => !classes.some((c) => c.dia === Rules.dayOf(ev.fecha) && Rules.overlaps(c.inicio, c.fin, ev.inicio, ev.fin)))
      .filter((ev) => !active.some((e) => e.fecha === ev.fecha && Rules.overlaps(e.inicio, e.fin, ev.inicio, ev.fin)))
      .sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio))
      .slice(0, limit);
  },

  /** Espacios libres de un día (en minutos) entre el rango del horario. */
  freeGaps(classes, dia) {
    const start = CONFIG.HORARIO_INICIO * 60, end = CONFIG.HORARIO_FIN * 60;
    const busy = classes.filter((c) => c.dia === dia).map((c) => [toMinutes(c.inicio), toMinutes(c.fin)]).sort((a, b) => a[0] - b[0]);
    const gaps = []; let cur = start;
    busy.forEach(([a, b]) => { if (a > cur) gaps.push([cur, a]); cur = Math.max(cur, b); });
    if (cur < end) gaps.push([cur, end]);
    return gaps.filter(([a, b]) => b - a >= 60);
  },

  validateClass(c) {
    if (!c.materia || c.materia.trim().length < 2) throw new ApiError('Escribe el nombre de la asignatura.');
    if (!(c.dia >= 1 && c.dia <= 6)) throw new ApiError('Selecciona un día válido.');
    if (!/^\d{2}:\d{2}$/.test(c.inicio) || !/^\d{2}:\d{2}$/.test(c.fin)) throw new ApiError('Las horas no son válidas.');
    if (toMinutes(c.fin) <= toMinutes(c.inicio)) throw new ApiError('La hora de fin debe ser posterior a la de inicio.');
    if (toMinutes(c.inicio) < CONFIG.HORARIO_INICIO * 60 || toMinutes(c.fin) > CONFIG.HORARIO_FIN * 60) {
      throw new ApiError(`El horario debe estar entre ${CONFIG.HORARIO_INICIO}:00 y ${CONFIG.HORARIO_FIN}:00.`);
    }
  },

  validateSurvey(r) {
    if (!r || typeof r !== 'object') throw new ApiError('Responde la encuesta.');
    for (let i = 1; i <= 5; i++) { const v = Number(r[`p${i}`]); if (!(v >= 1 && v <= 5)) throw new ApiError('Responde las preguntas de calificación.'); }
    if (!['si', 'no'].includes(r.p6)) throw new ApiError('Indica si recomendarías la actividad.');
  },
};

/* ------------------------------------------------------------------------ */
/* Backend local (localStorage)                                             */
/* ------------------------------------------------------------------------ */
const LocalBackend = {
  KEY: 'chl_db_v4',
  SESSION: 'chl_session',

  load() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { db = null; }
    if (!db || db.version !== 4) { db = buildSeedDB(); this.save(db); }
    // El catálogo de lugares (nombres, fotos, ubicación en el plano) siempre se toma
    // de js/data.js, para que los cambios en ese archivo se vean sin borrar los datos.
    db.places = DEMO_PLACES.map((p) => ({ ...p }));
    return db;
  },
  save(db) {
    try { localStorage.setItem(this.KEY, JSON.stringify(db)); }
    catch (e) { throw new ApiError('No hay espacio suficiente en el navegador para guardar los datos (¿la foto es muy grande?).'); }
  },

  sessionUserId() {
    try {
      const raw = sessionStorage.getItem(this.SESSION) || localStorage.getItem(this.SESSION);
      return raw ? JSON.parse(raw).userId : null;
    } catch (e) { return null; }
  },
  setSession(userId, remember) {
    const v = JSON.stringify({ userId, t: Date.now() });
    sessionStorage.setItem(this.SESSION, v);
    if (remember) localStorage.setItem(this.SESSION, v); else localStorage.removeItem(this.SESSION);
  },
  clearSession() { sessionStorage.removeItem(this.SESSION); localStorage.removeItem(this.SESSION); },

  publicUser(u) { const { passwordHash, ...rest } = u; return rest; },

  requireUser(db) {
    const id = this.sessionUserId();
    const u = id && db.users.find((x) => x.id === id);
    if (!u) throw new ApiError('Tu sesión ha finalizado. Inicia sesión de nuevo.', 401);
    return u;
  },

  /** Actividades con cupos calculados y el estado de inscripción del usuario. */
  eventsFor(db, userId) {
    return db.events.map((ev) => {
      const usados = db.enrollments.filter((e) => e.eventId === ev.id && e.estado !== 'cancelada').length;
      const mine = db.enrollments.filter((e) => e.eventId === ev.id && e.userId === userId && e.estado !== 'cancelada').pop();
      const p = db.places.find((x) => x.id === ev.placeId) || {};
      return {
        ...ev, lugar: p.nombre, ubicacion: p.ubicacion, imagen: p.imagen, campus: p.campus,
        inscritos: usados, cuposDisponibles: Math.max(0, ev.cuposTotales - ev.ocupadosBase - usados),
        miEstado: mine ? mine.estado : null, miInscripcion: mine ? mine.id : null,
      };
    });
  },

  /** F03 — Lugares con cupos = suma de cupos libres de sus próximas actividades. */
  placesFor(db, userId) {
    const evs = this.eventsFor(db, userId).filter((e) => Rules.isUpcoming(e));
    return db.places.map((p) => {
      const mine = evs.filter((e) => e.placeId === p.id).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
      return {
        ...p,
        proximas: mine.map((e) => ({ id: e.id, titulo: e.titulo, fecha: e.fecha, inicio: e.inicio, fin: e.fin, horas: e.horas, modalidad: e.modalidad, cuposDisponibles: e.cuposDisponibles, miEstado: e.miEstado })),
        cuposTotales: mine.reduce((a, e) => a + e.cuposTotales, 0),
        cuposDisponibles: mine.reduce((a, e) => a + e.cuposDisponibles, 0),
        horasMax: mine.reduce((a, e) => Math.max(a, e.horas), 0),
      };
    });
  },

  decorate(db, en, userId) {
    const ev = this.eventsFor(db, userId).find((x) => x.id === en.eventId) || {};
    return {
      id: en.id, eventId: en.eventId, estado: en.estado, qr: en.qr || '', creado: en.creado,
      titulo: ev.titulo, categoria: ev.categoria, modalidad: ev.modalidad, placeId: ev.placeId, lugar: ev.lugar,
      ubicacion: ev.ubicacion, fecha: ev.fecha, inicio: ev.inicio, fin: ev.fin, horas: ev.horas, fuente: ev.fuente, demo: ev.demo,
    };
  },

  findEnrollment(db, userId, id) {
    const e = db.enrollments.find((x) => x.id === id && x.userId === userId);
    if (!e) throw new ApiError('La inscripción no existe.', 404);
    return e;
  },

  async handle(action, d = {}) {
    const db = this.load();
    switch (action) {
      case 'ping': return { backend: 'local' };

      case 'register': {
        Validators.assertRegister(d);
        const correo = d.correo.trim().toLowerCase();
        const codigo = d.codigo.trim().toUpperCase();
        if (db.users.some((u) => u.correo === correo)) throw new ApiError('Ya existe una cuenta registrada con este correo institucional.', 409);
        if (db.users.some((u) => u.codigo === codigo)) throw new ApiError('Ya existe una cuenta registrada con este código estudiantil.', 409);
        const user = {
          id: uid('u'), nombre: d.nombre.trim().replace(/\s+/g, ' '), codigo, correo,
          passwordHash: sha256(d.password), programa: (d.programa || '').trim(),
          semestre: Number(d.semestre) || null, telefono: (d.telefono || '').trim(), foto: '', creado: todayISO(),
        };
        db.users.push(user); this.save(db);
        return { user: this.publicUser(user) };
      }

      case 'login': {
        const correo = String(d.correo || '').trim().toLowerCase();
        const u = db.users.find((x) => x.correo === correo);
        if (!u || u.passwordHash !== sha256(String(d.password || ''))) throw new ApiError('Correo o contraseña incorrectos.', 401);
        this.setSession(u.id, !!d.remember);
        return { user: this.publicUser(u) };
      }

      case 'resetPassword': {
        const correo = String(d.correo || '').trim().toLowerCase();
        const codigo = String(d.codigo || '').trim().toUpperCase();
        const u = db.users.find((x) => x.correo === correo && x.codigo === codigo);
        if (!u) throw new ApiError('El correo y el código estudiantil no coinciden con ninguna cuenta.', 404);
        if (Validators.passwordStrength(d.nueva).level < 3) throw new ApiError('La nueva contraseña no cumple los requisitos de seguridad.');
        u.passwordHash = sha256(d.nueva); this.save(db);
        return { ok: true };
      }

      case 'logout': this.clearSession(); return { ok: true };

      case 'me': {
        const id = this.sessionUserId(); const u = id && db.users.find((x) => x.id === id);
        return { user: u ? this.publicUser(u) : null };
      }

      case 'updateProfile': {
        const u = this.requireUser(db);
        Validators.assertProfile(d);
        u.nombre = d.nombre.trim().replace(/\s+/g, ' ');
        u.telefono = (d.telefono || '').trim();
        u.programa = (d.programa || '').trim();
        u.semestre = Number(d.semestre) || null;
        if (typeof d.foto === 'string') u.foto = d.foto;
        this.save(db);
        return { user: this.publicUser(u) };
      }

      case 'changePassword': {
        const u = this.requireUser(db);
        if (u.passwordHash !== sha256(String(d.actual || ''))) throw new ApiError('La contraseña actual no es correcta.');
        if (Validators.passwordStrength(d.nueva).level < 3) throw new ApiError('La nueva contraseña no cumple los requisitos de seguridad.');
        u.passwordHash = sha256(d.nueva); this.save(db);
        return { ok: true };
      }

      case 'deleteAccount': {
        const u = this.requireUser(db);
        if (u.passwordHash !== sha256(String(d.password || ''))) throw new ApiError('La contraseña no es correcta.');
        db.users = db.users.filter((x) => x.id !== u.id);
        ['enrollments', 'history', 'classes'].forEach((k) => { db[k] = db[k].filter((x) => x.userId !== u.id); });
        this.save(db); this.clearSession();
        return { ok: true };
      }

      case 'places': { const u = this.requireUser(db); return { places: this.placesFor(db, u.id) }; }

      case 'events': { const u = this.requireUser(db); return { events: this.eventsFor(db, u.id) }; }

      case 'enrollments': {
        const u = this.requireUser(db);
        const list = db.enrollments.filter((e) => e.userId === u.id).map((e) => this.decorate(db, e, u.id));
        list.sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio));
        return { enrollments: list };
      }

      case 'enroll': {
        const u = this.requireUser(db);
        const ev = this.eventsFor(db, u.id).find((x) => x.id === d.eventId);
        if (!ev) throw new ApiError('La actividad seleccionada no existe.', 404);
        if (!Rules.isUpcoming(ev)) throw new ApiError('La inscripción a esta actividad ya cerró.');
        if (ev.miEstado) throw new ApiError('Ya estás inscrito en esta actividad.', 409);
        if (ev.cuposDisponibles <= 0) throw new ApiError(`No hay cupos disponibles para “${ev.titulo}”.`, 409);
        const choque = db.enrollments.filter((e) => e.userId === u.id && ESTADOS_ACTIVOS.includes(e.estado))
          .map((e) => this.decorate(db, e, u.id)).find((e) => e.fecha === ev.fecha && Rules.overlaps(e.inicio, e.fin, ev.inicio, ev.fin));
        if (choque) throw new ApiError(`Se cruza con “${choque.titulo}” (${choque.inicio}–${choque.fin}).`, 409);
        const en = { id: uid('e'), userId: u.id, eventId: ev.id, estado: 'inscrita', qr: '', creado: todayISO() };
        db.enrollments.push(en); this.save(db);
        return { enrollment: this.decorate(db, en, u.id) };
      }

      case 'cancel': {
        const u = this.requireUser(db);
        const en = this.findEnrollment(db, u.id, d.id);
        if (en.estado !== 'inscrita') throw new ApiError('Solo se pueden cancelar inscripciones que aún no tienen asistencia registrada.');
        en.estado = 'cancelada'; en.canceladaEl = todayISO(); this.save(db);
        return { enrollment: this.decorate(db, en, u.id) };
      }

      case 'qr': {
        const u = this.requireUser(db);
        const en = this.findEnrollment(db, u.id, d.id);
        const ev = db.events.find((x) => x.id === en.eventId);
        if (ev.modalidad !== 'presencial') throw new ApiError('Las actividades virtuales se registran con “Confirmar asistencia”.');
        if (en.estado !== 'inscrita') throw new ApiError('Esta inscripción no está activa.');
        if (!en.qr) en.qr = `HL-${sha256(`${u.codigo}|${en.id}`).slice(0, 10).toUpperCase()}`;
        this.save(db);
        return { enrollment: this.decorate(db, en, u.id) };
      }

      case 'attend': { // escaneo del QR (presencial) o "Confirmar asistencia" (virtual)
        const u = this.requireUser(db);
        const en = this.findEnrollment(db, u.id, d.id);
        const ev = db.events.find((x) => x.id === en.eventId);
        if (en.estado !== 'inscrita') throw new ApiError('Esta inscripción no está activa.');
        if (!Rules.canAttend(ev)) throw new ApiError('La asistencia se registra el día de la actividad.');
        if (ev.modalidad === 'presencial' && !en.qr) throw new ApiError('Primero genera tu código QR.');
        en.estado = 'asistencia'; this.save(db);
        return { enrollment: this.decorate(db, en, u.id) };
      }

      case 'survey': {
        const u = this.requireUser(db);
        const en = this.findEnrollment(db, u.id, d.id);
        if (en.estado !== 'asistencia') throw new ApiError('La encuesta se responde después de registrar la asistencia.');
        Rules.validateSurvey(d.respuestas);
        const ev = db.events.find((x) => x.id === en.eventId);
        en.estado = 'completada'; en.encuesta = d.respuestas;
        db.history.push({ id: uid('h'), userId: u.id, eventId: ev.id, titulo: ev.titulo, categoria: ev.categoria, placeId: ev.placeId, fecha: ev.fecha, inicio: ev.inicio, fin: ev.fin, horas: ev.horas });
        this.save(db);
        return { enrollment: this.decorate(db, en, u.id) };
      }

      case 'history': {
        const u = this.requireUser(db);
        const list = db.history.filter((h) => h.userId === u.id).map((h) => {
          const p = db.places.find((x) => x.id === h.placeId) || {};
          return { ...h, lugar: p.nombre };
        });
        list.sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio));
        return { history: list };
      }

      case 'summary': {
        const u = this.requireUser(db);
        const hist = db.history.filter((h) => h.userId === u.id);
        const cumplidas = hist.reduce((s, h) => s + Number(h.horas), 0);
        const requeridas = CONFIG.HL_REQUERIDAS;
        const cats = ['Cultura', 'Deporte', 'Salud', 'Desarrollo humano'];
        return {
          summary: {
            requeridas, requeridasDemo: CONFIG.HL_REQUERIDAS_ES_DEMO, cumplidas,
            pendientes: Math.max(0, requeridas - cumplidas),
            porcentaje: requeridas ? clamp(Math.round((cumplidas / requeridas) * 100), 0, 100) : 0,
            activas: db.enrollments.filter((e) => e.userId === u.id && ESTADOS_ACTIVOS.includes(e.estado)).length,
            porCategoria: cats.map((c) => ({ categoria: c, horas: hist.filter((h) => h.categoria === c).reduce((s, h) => s + Number(h.horas), 0) })),
          },
        };
      }

      case 'classes': {
        const u = this.requireUser(db);
        return { classes: db.classes.filter((c) => c.userId === u.id) };
      }
      case 'addClass': {
        const u = this.requireUser(db);
        const c = { dia: Number(d.dia), inicio: d.inicio, fin: d.fin, materia: String(d.materia || '').trim(), salon: String(d.salon || '').trim() };
        Rules.validateClass(c);
        const choque = db.classes.find((x) => x.userId === u.id && x.dia === c.dia && Rules.overlaps(x.inicio, x.fin, c.inicio, c.fin));
        if (choque) throw new ApiError(`Se cruza con "${choque.materia}" (${choque.inicio}–${choque.fin}).`, 409);
        const rec = { id: uid('c'), userId: u.id, ...c };
        db.classes.push(rec); this.save(db);
        return { class: rec };
      }
      case 'deleteClass': {
        const u = this.requireUser(db);
        const before = db.classes.length;
        db.classes = db.classes.filter((c) => !(c.id === d.id && c.userId === u.id));
        if (db.classes.length === before) throw new ApiError('La clase no existe.', 404);
        this.save(db); return { ok: true };
      }
      case 'loadDemoClasses': {
        const u = this.requireUser(db);
        db.classes = db.classes.filter((c) => c.userId !== u.id).concat(DEMO_CLASSES.map((c) => ({ id: uid('c'), userId: u.id, ...c })));
        this.save(db); return { ok: true };
      }

      case 'news': return { items: [], source: 'local', live: false };

      default: throw new ApiError(`Acción desconocida: ${action}`, 404);
    }
  },
};

/* ------------------------------------------------------------------------ */
/* Backend PHP                                                              */
/* ------------------------------------------------------------------------ */
const PhpBackend = {
  async handle(action, data = {}) {
    let res;
    try {
      res = await fetch(`${CONFIG.API_URL}?action=${encodeURIComponent(action)}`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) { throw new ApiError('No fue posible conectar con el servidor.', 0); }
    let json = null;
    try { json = await res.json(); } catch (e) { throw new ApiError('Respuesta no válida del servidor.', res.status); }
    if (!res.ok || json.ok === false) throw new ApiError(json.error || 'Ocurrió un error en el servidor.', res.status);
    return json.data;
  },
};

/* ------------------------------------------------------------------------ */
/* Fachada                                                                  */
/* ------------------------------------------------------------------------ */
const API = {
  _backend: null,
  mode: 'local',

  async resolveBackend() {
    if (this._backend) return this._backend;
    const pref = CONFIG.BACKEND;
    const cached = sessionStorage.getItem('chl_backend');
    if (pref === 'local' || location.protocol === 'file:') { this.mode = 'local'; }
    else if (pref === 'php') { this.mode = 'php'; }
    else if (cached) { this.mode = cached; }
    else {
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 2500);
        const r = await fetch(`${CONFIG.API_URL}?action=ping`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        clearTimeout(t);
        const j = r.ok ? await r.json() : null;
        this.mode = j && j.ok && j.data && j.data.backend === 'php' ? 'php' : 'local';
      } catch (e) { this.mode = 'local'; }
      sessionStorage.setItem('chl_backend', this.mode);
    }
    this._backend = this.mode === 'php' ? PhpBackend : LocalBackend;
    return this._backend;
  },

  async call(action, data) {
    const b = await this.resolveBackend();
    return b.handle(action, data);
  },
};
