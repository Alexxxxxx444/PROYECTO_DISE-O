/* ==========================================================================
   Componentes de interfaz compartidos: tema, notificaciones, ventanas
   modales y estructura de la aplicación (barra lateral + barra superior)
   ========================================================================== */

/* ---------- F08: Modo claro / oscuro ---------- */
const Theme = {
  get() { return document.documentElement.getAttribute('data-theme') || 'light'; },
  set(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('chl_theme', t); } catch (e) { /* almacenamiento no disponible */ }
    $$('[data-theme-toggle]').forEach((b) => this.paint(b));
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  },
  /** Cambio rápido con transición suave (View Transitions API si existe). */
  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('chl_theme', next); } catch (e) { /* sin almacenamiento */ }
    const run = () => this.set(next);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(run); else run();
  },
  paint(btn) {
    const dark = this.get() === 'dark';
    btn.innerHTML = icon(dark ? 'sun' : 'moon');
    btn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    btn.title = `${dark ? 'Modo claro' : 'Modo oscuro'} (Alt + T)`;
  },
  /** Botón flotante y atajo de teclado (Alt + T) disponibles en todas las páginas. */
  installQuick() {
    if (document.querySelector('.theme-fab')) return;
    const fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'theme-fab'; fab.setAttribute('data-theme-toggle', '');
    document.body.appendChild(fab);
    document.addEventListener('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T' || e.code === 'KeyT')) {
        e.preventDefault(); this.toggle();
        if (typeof Toast !== 'undefined') Toast.show(this.get() === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado', 'info', 1600);
      }
    });
  },
  bind(root = document) {
    $$('[data-theme-toggle]', root).forEach((b) => {
      this.paint(b);
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', () => this.toggle());
    });
  },
};

/* ---------- Notificaciones ---------- */
const Toast = {
  region() {
    let r = $('.toast-region');
    if (!r) { r = document.createElement('div'); r.className = 'toast-region'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
    return r;
  },
  show(message, type = 'info', ms = 4200) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${icon(type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info')}<div>${esc(message)}</div>`;
    this.region().appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 260); }, ms);
  },
  success(m) { this.show(m, 'success'); },
  error(m) { this.show(m, 'error', 5500); },
};

/* ---------- Ventanas modales accesibles ---------- */
const Modal = {
  open({ title, body = '', iconName = null, danger = false, actions = [], size = '' , onOpen = null }) {
    const prev = document.activeElement;
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    const titleId = uid('mt');
    back.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="modal-header">
          <div>
            ${iconName ? `<div class="modal-icon ${danger ? 'danger' : ''}">${icon(iconName, 'icon-lg')}</div>` : ''}
            <h2 id="${titleId}">${esc(title)}</h2>
          </div>
          <button class="icon-btn" type="button" data-close aria-label="Cerrar ventana">${icon('x')}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-footer"></div>` : ''}
      </div>`;
    const footer = $('.modal-footer', back);
    const close = (value) => {
      back.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => back.remove(), 200);
      prev && prev.focus && prev.focus();
      ctrl.resolve(value);
    };
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `btn ${a.class || 'btn-outline'}`; b.innerHTML = a.html || esc(a.label);
      if (a.id) b.id = a.id;
      b.addEventListener('click', () => (a.onClick ? a.onClick({ close, button: b, root: back }) : close(a.value)));
      footer.appendChild(b);
    });
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Tab') { // trampa de foco
        const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', back).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
    $$('[data-close]', back).forEach((b) => b.addEventListener('click', () => close(null)));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('open'));
    const ctrl = { el: back, close };
    ctrl.result = new Promise((res) => { ctrl.resolve = res; });
    onOpen && onOpen(back, close);
    setTimeout(() => {
      const first = $('[autofocus]', back) || $('.modal-footer .btn:last-child', back) || $('[data-close]', back);
      first && first.focus();
    }, 30);
    return ctrl;
  },

  /** Confirmación: devuelve una promesa con true / false. */
  confirm({ title, message, confirmText = 'Confirmar', cancelText = 'Volver', danger = false, iconName = 'info' }) {
    const m = this.open({
      title, iconName: danger ? 'alert' : iconName, danger,
      body: `<p class="muted" style="margin:0">${message}</p>`,
      actions: [
        { label: cancelText, class: 'btn-outline', value: false },
        { label: confirmText, class: danger ? 'btn-danger' : 'btn-primary', value: true },
      ],
    });
    return m.result.then((v) => v === true);
  },
};

/* ---------- Estructura de la aplicación ---------- */
const NAV = [
  { group: 'Principal', items: [
    { key: 'inicio', href: 'inicio.html', label: 'Inicio', icon: 'home' },
    { key: 'noticias', href: 'noticias.html', label: 'Noticias UNAB', icon: 'globe' },
    { key: 'perfil', href: 'perfil.html', label: 'Mi perfil', icon: 'user' },
  ] },
  { group: 'Bienestar · Horas Libres', items: [
    { key: 'agenda', href: 'cronograma.html', label: 'Agenda de actividades', icon: 'calendar' },
    { key: 'mis-lugares', href: 'mis-lugares.html', label: 'Mis inscripciones', icon: 'listCheck', badge: 'activas' },
    { key: 'horas', href: 'horas-libres.html', label: 'Mis Horas Libres', icon: 'clock' },
    { key: 'lugares', href: 'lugares.html', label: 'Lugares del campus', icon: 'pin' },
    { key: 'mapa', href: 'lugares.html?vista=mapa', label: 'Mapa del campus', icon: 'map' },
  ] },
  { group: 'Organización', items: [
    { key: 'horario', href: 'horario.html', label: 'Horario semanal', icon: 'gears' },
    { key: 'constancia', href: 'constancia.html', label: 'Constancia de HL', icon: 'certificate' },
  ] },
];

/** Logotipo: isotipo UNAB en azul Ciencias de la Salud + nombre de la plataforma. */
function brandLockup({ href = 'inicio.html', theme = 'dark' } = {}) {
  return `
    <a class="brand-lockup ${theme}" href="${href}" aria-label="UNAB Campus HL, ir al inicio">
      <img class="brand-iso" src="assets/img/unab/isotipo-azul.png" alt="" width="40" height="45">
      <span class="brand-sep" aria-hidden="true"></span>
      <span class="brand-words"><b>unab</b><strong>Campus HL</strong></span>
    </a>`;
}

const App = {
  user: null,
  summary: null,

  /**
   * Inicializa una página protegida: verifica la sesión, pinta la estructura
   * y devuelve el usuario. Redirige al inicio de sesión si no hay sesión.
   */
  async init({ page, title, crumb = 'UNAB Campus HL' }) {
    try {
      const { user } = await API.call('me');
      if (!user) throw new Error('sin sesión');
      this.user = user;
    } catch (e) {
      location.replace(`index.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`);
      return new Promise(() => {}); // detiene la ejecución de la página
    }
    try { this.summary = (await API.call('summary')).summary; } catch (e) { this.summary = null; }
    this.renderShell(page, title, crumb);
    return this.user;
  },

  renderShell(page, title, crumb) {
    const s = this.summary || { porcentaje: 0, cumplidas: 0, requeridas: 0, activas: 0 };
    const nav = NAV.map((g) => `
      <div class="nav-label">${esc(g.group)}</div>
      ${g.items.map((it) => `
        <a href="${it.href}" ${it.key === page ? 'aria-current="page"' : ''}>
          ${icon(it.icon)}<span>${esc(it.label)}</span>
          ${it.badge === 'activas' && s.activas ? `<span class="nav-badge" aria-label="${s.activas} inscripciones activas">${s.activas}</span>` : ''}
        </a>`).join('')}`).join('');

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar'; sidebar.id = 'sidebar'; sidebar.setAttribute('aria-label', 'Navegación principal');
    sidebar.innerHTML = `
      <div class="sidebar-brand">${brandLockup()}</div>
      <nav class="nav">${nav}</nav>
      <div class="sidebar-deco">${brandPattern(3, 4)}</div>
      <div class="sidebar-footer">
        <a class="sidebar-progress" href="horas-libres.html" style="display:block;text-decoration:none">
          <div class="row-between"><span>Avance de HL</span><span>${s.porcentaje}%</span></div>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.porcentaje}" aria-label="Avance de Horas Libres">
            <div class="progress-bar" style="width:${s.porcentaje}%"></div>
          </div>
          <div class="xsmall" style="color:#7FA6C2;margin-top:8px">${s.cumplidas} de ${s.requeridas} horas libres</div>
        </a>
      </div>`;

    const u = this.user;
    const topbar = document.createElement('header');
    topbar.className = 'topbar';
    topbar.innerHTML = `
      <button class="icon-btn menu-toggle" type="button" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
      <div>
        <div class="topbar-crumb">${esc(crumb)}</div>
        <p class="topbar-title">${esc(title)}</p>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" type="button" data-theme-toggle></button>
        <div class="user-menu">
          <button class="user-trigger" type="button" aria-haspopup="true" aria-expanded="false" id="userTrigger">
            ${this.avatarHTML(u)}
            <span class="user-trigger-name">${esc(firstName(u.nombre))}</span>
            ${icon('chevronDown', 'icon-sm')}
          </button>
          <div class="dropdown" id="userDropdown" role="menu">
            <div class="dropdown-head"><strong>${esc(u.nombre)}</strong><span>${esc(u.correo)}</span></div>
            <a href="perfil.html" role="menuitem">${icon('user', 'icon-sm')} Mi perfil</a>
            <a href="constancia.html" role="menuitem">${icon('printer', 'icon-sm')} Constancia de HL</a>
            <button type="button" role="menuitem" class="danger" data-logout>${icon('logout', 'icon-sm')} Cerrar sesión</button>
          </div>
        </div>
      </div>`;

    const main = $('#main');
    const wrap = document.createElement('div');
    wrap.className = 'main';
    main.parentNode.insertBefore(wrap, main);
    wrap.appendChild(topbar);
    wrap.appendChild(main);
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    const L = CONFIG.LINKS;
    footer.className = 'app-footer rich';
    footer.innerHTML = `
      <div class="footer-cols">
        <div>
          ${brandLockup()}
          <p style="margin-top:12px">Consulta tus Horas Libres, la agenda de Bienestar y los lugares del campus en un solo lugar.</p>
        </div>
        <div>
          <h4>Bienestar Universitario</h4>
          <ul>
            <li><a href="mailto:bienestar@unab.edu.co">bienestar@unab.edu.co</a></li>
            <li><a href="${L.bienestar}" target="_blank" rel="noopener">bienestar.unab.edu.co</a></li>
            <li><a href="${L.registroHL}" target="_blank" rel="noopener">Cómo registrar horas libres</a></li>
          </ul>
        </div>
        <div>
          <h4>Somos UNAB</h4>
          <ul>
            <li><a href="${L.miportalu}" target="_blank" rel="noopener">MiPortalU</a></li>
            <li><a href="${L.correo}" target="_blank" rel="noopener">Correo electrónico</a> · <a href="${L.cosmos}" target="_blank" rel="noopener">Cosmos</a></li>
            <li><a href="${L.biblioteca}" target="_blank" rel="noopener">Biblioteca</a> · <a href="${L.unabDigital}" target="_blank" rel="noopener">UNAB Digital</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-meta">
        <span>Universidad Autónoma de Bucaramanga – UNAB · Av. 42 N.° 48-11, Bucaramanga. Proyecto académico; no es un sitio oficial de la universidad. Fotografías: unab.edu.co.</span>
        <span>Datos: ${API.mode === 'php' ? 'servidor PHP (base de datos)' : 'almacenamiento local de este navegador (demo)'}</span>
      </div>`;
    wrap.appendChild(footer);
    document.body.insertBefore(sidebar, document.body.firstChild);
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    document.body.appendChild(scrim);

    // Menú móvil
    const toggleBtn = $('.menu-toggle', topbar);
    const setNav = (open) => { document.body.classList.toggle('nav-open', open); toggleBtn.setAttribute('aria-expanded', String(open)); };
    toggleBtn.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
    scrim.addEventListener('click', () => setNav(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

    // Menú de usuario
    const trig = $('#userTrigger'), dd = $('#userDropdown');
    trig.addEventListener('click', (e) => { e.stopPropagation(); const o = !dd.classList.contains('open'); dd.classList.toggle('open', o); trig.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) { dd.classList.remove('open'); trig.setAttribute('aria-expanded', 'false'); } });
    $('[data-logout]').addEventListener('click', () => this.logout());

    Theme.bind();
    document.title = `${title} · UNAB Campus HL`;
  },

  avatarHTML(u, cls = '') {
    return `<span class="avatar ${cls}">${u.foto ? `<img src="${esc(u.foto)}" alt="">` : esc(initials(u.nombre))}</span>`;
  },

  async logout() {
    const ok = await Modal.confirm({ title: '¿Cerrar sesión?', message: 'Tendrás que ingresar de nuevo con tu correo institucional.', confirmText: 'Cerrar sesión', iconName: 'logout' });
    if (!ok) return;
    await API.call('logout');
    location.href = 'index.html';
  },

  /** Recarga el resumen y actualiza los elementos de la estructura. */
  async refreshSummary() {
    try { this.summary = (await API.call('summary')).summary; } catch (e) { return; }
    const s = this.summary;
    const bar = $('.sidebar-progress .progress-bar'); if (bar) bar.style.width = `${s.porcentaje}%`;
    const pct = $('.sidebar-progress .row-between span:last-child'); if (pct) pct.textContent = `${s.porcentaje}%`;
    const link = $('.nav a[href="mis-lugares.html"]');
    if (link) { $('.nav-badge', link)?.remove(); if (s.activas) link.insertAdjacentHTML('beforeend', `<span class="nav-badge">${s.activas}</span>`); }
    return s;
  },
};

/** Rellena los marcadores data-icon y data-pattern del HTML estático. */
function hydrate(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    if (el.dataset.hydrated) return;
    const svg = icon(el.dataset.icon, el.dataset.iconClass || 'icon');
    if (el.children.length || el.textContent.trim()) el.insertAdjacentHTML('afterbegin', svg); else el.innerHTML = svg;
    el.dataset.hydrated = '1';
  });
  $$('[data-photo]', root).forEach((el) => {
    el.classList.add('photo');
    if (!el.dataset.credit) el.dataset.credit = 'Foto: UNAB';
    el.style.setProperty('--photo', `url("${new URL(el.dataset.photo, location.href).href}")`);
    if (el.dataset.photoPos) el.style.setProperty('--photo-pos', el.dataset.photoPos);
  });
  $$('[data-pattern]', root).forEach((el) => { const [c, r] = el.dataset.pattern.split('x').map(Number); el.innerHTML = brandPattern(c, r); });
}
hydrate();
Theme.installQuick();
Theme.bind();

/** Estado de inscripción → etiqueta e insignia. */
function estadoBadge(e) {
  if (e.estado === 'completada') return `<span class="badge badge-success">${icon('check', 'icon-sm')} Completada</span>`;
  if (e.estado === 'cancelada') return `<span class="badge badge-danger">Cancelada</span>`;
  if (e.estado === 'asistencia') return `<span class="badge badge-warning">${icon('notepad', 'icon-sm')} Falta la encuesta</span>`;
  if (e.fecha < todayISO()) return `<span class="badge badge-warning">${icon('clock', 'icon-sm')} Pendiente de asistencia</span>`;
  if (e.fecha === todayISO()) return `<span class="badge badge-dark">Hoy</span>`;
  return `<span class="badge">Inscrita</span>`;
}

function categoriaIcon(cat) {
  return ({ Deporte: 'ball', 'Cafetería': 'coffee', Cultura: 'stage', Salud: 'heartPulse', 'Desarrollo humano': 'bulb', Virtual: 'laptop' })[cat] || 'info';
}
function modalidadBadge(m) {
  return m === 'virtual'
    ? `<span class="badge badge-neutral">${icon('laptop', 'icon-sm')} Virtual</span>`
    : `<span class="badge badge-neutral">${icon('pin', 'icon-sm')} Presencial</span>`;
}

/** Animación de conteo numérico. */
function countUp(el, to, ms = 800) {
  const start = performance.now();
  const step = (t) => { const k = Math.min(1, (t - start) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/** Anillo de progreso SVG. */
function ringHTML(pct, label = 'completado') {
  const r = 70, c = 2 * Math.PI * r;
  return `
    <div class="ring" role="img" aria-label="${pct}% ${label}">
      <svg viewBox="0 0 168 168"><circle class="ring-track" cx="84" cy="84" r="${r}" fill="none" stroke-width="14"/>
      <circle class="ring-value" cx="84" cy="84" r="${r}" fill="none" stroke-width="14" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - pct / 100)}"/></svg>
      <div class="ring-center"><strong>${pct}%</strong><span>${esc(label)}</span></div>
    </div>`;
}
function animateRings(root = document) {
  requestAnimationFrame(() => setTimeout(() => $$('.ring-value', root).forEach((c) => { c.style.strokeDashoffset = c.dataset.target; }), 60));
}
function animateBars(root = document) {
  requestAnimationFrame(() => setTimeout(() => $$('[data-width]', root).forEach((b) => { b.style.width = b.dataset.width; }), 60));
}
