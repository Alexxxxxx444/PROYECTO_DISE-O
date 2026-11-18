/* ==========================================================================
   Ubicación en Google Maps (Campus El Jardín y CSU)
   Usa el mapa incrustable de Google Maps (no requiere clave de API) y
   enlaces para abrir la ubicación o pedir indicaciones "Cómo llegar".
   ========================================================================== */

const SEDES_MAPS = [
  {
    id: 'jardin', nombre: 'Campus El Jardín', direccion: 'Av. 42 N.° 48-11, Bucaramanga',
    query: 'Universidad Autónoma de Bucaramanga, Avenida 42 #48-11, Bucaramanga, Santander',
  },
  {
    id: 'csu', nombre: 'CSU · Centro de Servicios Universitarios', direccion: 'Cra. 47 N.° 53-78, barrio Terrazas, Bucaramanga',
    query: 'UNAB Centro de Servicios Universitarios CSU, Carrera 47 #53-78, Terrazas, Bucaramanga',
  },
];

const GMaps = {
  current: 'jardin',

  embedUrl(q) { return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=17&hl=es&output=embed`; },
  openUrl(q) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`; },
  routeUrl(q) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`; },

  render(root) {
    const s = SEDES_MAPS.find((x) => x.id === this.current);
    root.innerHTML = `
      <div class="row-between gmap-head">
        <div>
          <h2 class="card-title-sm" style="margin:0">${icon('globe', 'icon-sm')} Ubicación en Google Maps</h2>
          <p class="card-sub">${esc(s.nombre)} · ${esc(s.direccion)}</p>
        </div>
        <div class="chips" role="tablist" aria-label="Sede">
          ${SEDES_MAPS.map((x) => `<button type="button" class="chip" role="tab" aria-selected="${x.id === s.id}" data-sede="${x.id}">${icon('pin', 'icon-sm')} ${x.id === 'csu' ? 'CSU' : 'Campus El Jardín'}</button>`).join('')}
        </div>
      </div>
      <div class="gmap">
        <iframe title="Mapa de Google: ${esc(s.nombre)}" src="${this.embedUrl(s.query)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
      <div class="row gmap-actions">
        <a class="btn btn-primary btn-sm" href="${this.routeUrl(s.query)}" target="_blank" rel="noopener">${icon('bus', 'icon-sm')} Cómo llegar</a>
        <a class="btn btn-outline btn-sm" href="${this.openUrl(s.query)}" target="_blank" rel="noopener">${icon('map', 'icon-sm')} Abrir en Google Maps</a>
        <span class="xsmall muted">Necesita conexión a internet.</span>
      </div>`;
    $$('[data-sede]', root).forEach((b) => b.addEventListener('click', () => { this.current = b.dataset.sede; this.render(root); }));
  },
};
