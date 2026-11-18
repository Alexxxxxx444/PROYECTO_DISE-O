/* ==========================================================================
   F06 — Mapa interactivo del campus (Campus El Jardín y CSU)
   --------------------------------------------------------------------------
   CÓMO USAR LOS PLANOS OFICIALES:
     1. Guarde las imágenes como assets/img/mapa-jardin.jpg y
        assets/img/mapa-csu.jpg (o cambie la ruta "imagen" abajo).
     2. Abra lugares.html?vista=mapa&calibrar=1 y haga clic en el plano:
        se muestran las coordenadas (%) para copiarlas en js/data.js
        (campo mapa: {x, y}) y en php/db.php.
   Si una imagen no existe, se dibuja un plano ILUSTRATIVO (no oficial).
   ========================================================================== */

const CAMPUS_MAPS = [
  {
    id: 'jardin',
    nombre: 'Campus El Jardín',
    direccion: 'Av. 42 N.° 48-11, Bucaramanga',
    imagen: 'assets/img/mapa-jardin.jpg',
  },
  {
    id: 'csu',
    nombre: 'CSU',
    nombreLargo: 'Centro de Servicios Universitarios (CSU)',
    direccion: 'Cra. 47 N.° 53-78, barrio Terrazas, Bucaramanga',
    imagen: 'assets/img/mapa-csu.jpg',
  },
];

const CampusMap = {
  current: 'jardin',
  calibrate: false,

  pinState(p) { if (!p.proximas || !p.proximas.length) return 'ok'; return p.cuposDisponibles <= 0 ? 'full' : p.cuposDisponibles / Math.max(1, p.cuposTotales) <= 0.25 ? 'low' : 'ok'; },

  /** Plano ilustrativo de respaldo (se usa solo si falta la imagen oficial). */
  fallbackSVG(id) {
    const b = (x, y, w, h) => `<rect class="m-bld" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`;
    const common = `<rect class="m-ground" x="0" y="0" width="800" height="500"/>`;
    if (id === 'csu') {
      return `<svg viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true">${common}
        <path class="m-green" d="M40 40h220v150H40z"/><circle class="m-green" cx="690" cy="420" r="90"/>
        <path class="m-path" d="M0 260 C 200 250 600 270 800 255"/><path class="m-path" d="M420 0 C 410 160 430 340 420 500"/>
        <rect class="m-court" x="90" y="300" width="200" height="120" rx="6"/><rect class="m-court" x="520" y="60" width="200" height="120" rx="6"/>
        ${b(200, 150, 140, 70)}${b(470, 290, 130, 70)}${b(600, 300, 90, 50)}${b(300, 330, 80, 50)}
        <text class="m-label" x="400" y="490" text-anchor="middle">Plano ilustrativo · no oficial</text></svg>`;
    }
    return `<svg viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true">${common}
      <path class="m-green" d="M20 20h210v120H20z"/><path class="m-green" d="M330 300c40-30 120-36 170-10 34 18 40 70 10 100-40 40-150 44-190 6-26-24-22-70 10-96z"/>
      <path class="m-path" d="M0 250 C 160 240 260 260 400 250 S 640 230 800 250"/><path class="m-path" d="M400 0 C 390 120 410 180 400 250 S 380 420 400 500"/>
      ${b(60, 160, 120, 60)}${b(280, 60, 90, 70)}${b(450, 40, 110, 60)}${b(600, 60, 160, 110)}${b(170, 390, 120, 50)}${b(600, 300, 120, 60)}
      <circle class="m-plaza" cx="400" cy="250" r="24"/>
      <text class="m-label" x="400" y="490" text-anchor="middle">Plano ilustrativo · no oficial</text></svg>`;
  },

  /**
   * Dibuja las pestañas de campus, el plano y los marcadores.
   * @param {HTMLElement} container
   * @param {Array} places   lugares ya filtrados
   * @param {Object} opts    { onSelect(id), selected }
   */
  render(container, places, { onSelect, selected } = {}) {
    const sel = places.find((p) => p.id === selected);
    if (sel && CAMPUS_MAPS.some((m) => m.id === sel.campus)) this.current = sel.campus;
    const map = CAMPUS_MAPS.find((m) => m.id === this.current);
    const here = places.filter((p) => p.campus === map.id);

    container.innerHTML = `
      <div class="map-tabs" role="tablist" aria-label="Plano">
        ${CAMPUS_MAPS.map((m) => `<button type="button" role="tab" class="chip" data-campus="${m.id}" aria-selected="${m.id === map.id}">
          ${icon('map', 'icon-sm')} ${esc(m.nombre)}<span class="count">${places.filter((p) => p.campus === m.id).length}</span></button>`).join('')}
      </div>
      <p class="map-address small muted">${icon('pin', 'icon-sm')} ${esc(map.nombreLargo || map.nombre)} · ${esc(map.direccion)}</p>
      <div class="map-stage ${this.calibrate ? 'calibrating' : ''}" id="mapStage">
        <img class="map-img" src="${esc(map.imagen)}" alt="Plano de ${esc(map.nombre)}">
        <div class="map-fallback hidden">${this.fallbackSVG(map.id)}</div>
        ${here.map((p) => `
          <button type="button" class="map-pin ${this.pinState(p)} ${p.id === selected ? 'active' : ''}" data-id="${esc(p.id)}"
            style="left:${p.mapa.x}%;top:${p.mapa.y}%" aria-label="${esc(p.nombre)}: ${p.cuposDisponibles} cupos disponibles. Ver información">
            <span class="map-pin-dot">${icon(categoriaIcon(p.categoria), 'icon-sm')}</span>
            <span class="map-pin-label">${esc(p.nombre)}</span>
          </button>`).join('')}
        ${!here.length ? `<div class="map-empty">No hay lugares de este campus con los filtros actuales.</div>` : ''}
      </div>`;

    // Imagen oficial o plano ilustrativo de respaldo
    const img = $('.map-img', container);
    const showFallback = () => {
      img.classList.add('hidden');
      $('.map-fallback', container).classList.remove('hidden');
      document.dispatchEvent(new CustomEvent('campusmap:official', { detail: false }));
    };
    img.addEventListener('error', showFallback);
    img.addEventListener('load', () => document.dispatchEvent(new CustomEvent('campusmap:official', { detail: true })));
    if (img.complete && img.naturalWidth === 0 && img.src) showFallback();

    $$('[data-campus]', container).forEach((b) => b.addEventListener('click', () => {
      this.current = b.dataset.campus;
      this.render(container, places, { onSelect, selected: null });
      if (typeof GMaps !== 'undefined' && $('#gmaps')) { GMaps.current = this.current; GMaps.render($('#gmaps')); }
      onSelect && onSelect(null);
    }));
    $$('.map-pin', container).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      $$('.map-pin', container).forEach((x) => x.classList.toggle('active', x === b));
      onSelect && onSelect(b.dataset.id);
    }));

    // Modo calibración: clic en el plano → coordenadas en porcentaje
    if (this.calibrate) {
      $('#mapStage', container).addEventListener('click', (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
        const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
        Toast.show(`Coordenadas en ${map.nombre}: mapa: { x: ${x}, y: ${y} }`, 'info', 8000);
        try { navigator.clipboard.writeText(`mapa: { x: ${x}, y: ${y} },`); } catch (err) { /* sin portapapeles */ }
      });
    }
  },

  /** Lugares cuyo campus no tiene plano (p. ej. si están en otra sede). */
  outside(places) { return places.filter((p) => !CAMPUS_MAPS.some((m) => m.id === p.campus)); },
};
