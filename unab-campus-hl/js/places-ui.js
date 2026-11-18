/* ==========================================================================
   Componentes compartidos de lugares y actividades de Bienestar
   Usados por: lugares.html, cronograma.html, inicio.html y horario.html
   ========================================================================== */

/* ---------------------------------------------------------------- Actividades */
const EventsUI = {
  cuposBadge(ev) {
    if (ev.cuposDisponibles <= 0) return '<span class="badge badge-danger">Sin cupos</span>';
    const libres = ev.cuposTotales - ev.ocupadosBase;
    if (ev.cuposDisponibles / Math.max(1, libres) <= 0.25 || ev.cuposDisponibles <= 5) return `<span class="badge badge-warning">Últimos ${ev.cuposDisponibles} cupos</span>`;
    return `<span class="badge badge-success">${ev.cuposDisponibles} cupos</span>`;
  },

  sourceBadge(ev) {
    return ev.fuente
      ? `<a class="badge badge-source" href="${esc(ev.fuente)}" target="_blank" rel="noopener" title="Ver publicación de la UNAB">${icon('globe', 'icon-sm')} Actividad real UNAB</a>`
      : '<span class="badge badge-demo" title="Actividad de ejemplo sin publicación oficial encontrada">Ejemplo</span>';
  },

  /** Botón principal según el estado del estudiante. */
  actionHTML(ev, cls = 'btn-sm') {
    if (ev.miEstado === 'completada') return `<span class="badge badge-success">${icon('check', 'icon-sm')} Completada</span>`;
    if (ev.miEstado) return `<a class="btn ${cls} btn-outline" href="mis-lugares.html">${icon('check', 'icon-sm')} Inscrito</a>`;
    if (!Rules.isUpcoming(ev)) return `<span class="badge badge-neutral">Finalizada</span>`;
    if (ev.cuposDisponibles <= 0) return `<button class="btn ${cls} btn-primary" type="button" disabled>Sin cupos</button>`;
    return `<button class="btn ${cls} btn-primary" type="button" data-enroll-event="${esc(ev.id)}">${icon('plus', 'icon-sm')} Inscribirme</button>`;
  },

  /** Fila de agenda (cronograma / lugares / panel). */
  rowHTML(ev, { compact = false } = {}) {
    const d = parseISODate(ev.fecha);
    return `
      <article class="event-row ${ev.miEstado ? 'is-mine' : ''} ${!Rules.isUpcoming(ev) ? 'is-past' : ''}" data-event="${esc(ev.id)}">
        <div class="event-time"><strong>${ev.inicio}</strong><span>${ev.fin}</span></div>
        <div class="event-icon cat-${esc((ev.categoria || '').replace(/\s/g, '-').toLowerCase())}">${icon(categoriaIcon(ev.categoria))}</div>
        <div class="event-main">
          <button type="button" class="event-title" data-event-detail="${esc(ev.id)}">${esc(ev.titulo)}</button>
          <div class="event-meta">
            <span>${icon(ev.modalidad === 'virtual' ? 'laptop' : 'pin', 'icon-sm')} ${esc(ev.lugar)}</span>
            ${compact ? `<span>${icon('calendar', 'icon-sm')} ${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}</span>` : ''}
            <span>${esc(ev.categoria)}</span>
          </div>
        </div>
        <div class="event-hl" title="Horas libres que otorga"><strong>+${ev.horas}</strong><span>HL</span></div>
        <div class="event-side">${compact ? '' : EventsUI.cuposBadge(ev)}${EventsUI.actionHTML(ev)}</div>
      </article>`;
  },

  detail(ev, { onDone } = {}) {
    const d = parseISODate(ev.fecha);
    Modal.open({
      title: ev.titulo, iconName: categoriaIcon(ev.categoria), size: 'modal-wide',
      body: `
        <div class="row" style="margin-bottom:12px">
          <span class="badge badge-dark">${esc(ev.categoria)}</span>${modalidadBadge(ev.modalidad)}${EventsUI.cuposBadge(ev)}${EventsUI.sourceBadge(ev)}
        </div>
        <p class="muted">${esc(ev.descripcion)}</p>
        <dl class="detail-list">
          <div><dt>${icon('calendar', 'icon-sm')} Fecha</dt><dd>${DIAS[d.getDay()]} ${formatDate(ev.fecha)}</dd></div>
          <div><dt>${icon('clock', 'icon-sm')} Hora</dt><dd>${formatRange(ev.inicio, ev.fin)}</dd></div>
          <div><dt>${icon(ev.modalidad === 'virtual' ? 'laptop' : 'pin', 'icon-sm')} Lugar</dt><dd>${esc(ev.lugar)}<br><span class="xsmall muted">${esc(ev.ubicacion || '')}</span></dd></div>
          <div><dt>${icon('ribbon', 'icon-sm')} Horas libres</dt><dd>Asistencia válida por ${plural(ev.horas, 'hora libre', 'horas libres')}</dd></div>
        </dl>
        ${ev.notaHoras ? `<p class="xsmall muted" style="margin-top:10px">${esc(ev.notaHoras)}</p>` : ''}
        <div class="alert" style="margin:14px 0 0">${icon('info', 'icon-sm')}<span>${ev.modalidad === 'virtual'
          ? 'Actividad virtual: el día del evento pulsa <strong>Confirmar asistencia</strong> y luego responde la encuesta para que se sumen tus horas.'
          : 'Actividad presencial: genera tu <strong>código QR</strong> en Mis inscripciones y preséntalo al ingresar. Después responde la encuesta.'}</span></div>`,
      actions: [
        { label: 'Cerrar', class: 'btn-outline', value: null },
        ...(Rules.isUpcoming(ev) && !ev.miEstado && ev.cuposDisponibles > 0
          ? [{ html: `${icon('plus', 'icon-sm')} Inscribirme`, class: 'btn-primary', onClick: ({ close }) => { close(); EventsUI.enroll(ev, { onDone }); } }] : []),
      ],
    });
  },

  /** Inscripción a una actividad, con aviso de cruce con clases (F07). */
  async enroll(ev, { onDone } = {}) {
    let classes = [];
    try { classes = (await API.call('classes')).classes; } catch (e) { /* sin advertencias */ }
    const d = parseISODate(ev.fecha);
    const clash = classes.find((c) => c.dia === d.getDay() && Rules.overlaps(c.inicio, c.fin, ev.inicio, ev.fin));
    const m = Modal.open({
      title: 'Confirmar inscripción', iconName: 'certificate',
      body: `
        <div class="enroll-card">
          <div class="event-icon">${icon(categoriaIcon(ev.categoria))}</div>
          <div><strong>${esc(ev.titulo)}</strong>
          <div class="small muted">${DIAS[d.getDay()]} ${formatDate(ev.fecha)} · ${formatRange(ev.inicio, ev.fin)}</div>
          <div class="small muted">${esc(ev.lugar)}</div></div>
        </div>
        ${clash ? `<div class="alert alert-danger">${icon('alert', 'icon-sm')}<span>Se cruza con tu clase de <strong>${esc(clash.materia)}</strong> (${clash.inicio}–${clash.fin}). Puedes inscribirte, pero revisa tu horario.</span></div>` : ''}
        <div class="enroll-summary">
          <div>${icon('ribbon', 'icon-sm')} <span>Asistencia válida por <strong>${plural(ev.horas, 'hora libre', 'horas libres')}</strong></span></div>
          <div>${icon('student', 'icon-sm')} <span><strong>${ev.cuposDisponibles}</strong> cupos disponibles</span></div>
          <div>${icon(ev.modalidad === 'virtual' ? 'laptop' : 'pin', 'icon-sm')} <span>${ev.modalidad === 'virtual' ? 'Virtual: confirmarás asistencia el día del evento' : 'Presencial: registro con código QR'}</span></div>
        </div>`,
      actions: [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        { html: `${icon('check', 'icon-sm')} Inscribirme`, class: 'btn-primary', id: 'enConfirm', onClick: async ({ close, button }) => {
          FormUI.setLoading(button, true, 'Inscribiendo…');
          try {
            await API.call('enroll', { eventId: ev.id });
            close(true);
            Toast.success(`¡Listo! Quedaste inscrito en “${ev.titulo}”.`);
            await App.refreshSummary();
            onDone && onDone();
          } catch (err) { FormUI.setLoading(button, false); Toast.error(err.message); }
        } },
      ],
    });
    return m.result;
  },

  /** Delegación de clics para cualquier lista de actividades. */
  bind(root, getEvents, onDone) {
    root.addEventListener('click', (e) => {
      const en = e.target.closest('[data-enroll-event]');
      const de = e.target.closest('[data-event-detail]');
      const id = (en || de) && (en ? en.dataset.enrollEvent : de.dataset.eventDetail);
      if (!id) return;
      const ev = getEvents().find((x) => x.id === id);
      if (!ev) return;
      if (en) EventsUI.enroll(ev, { onDone }); else EventsUI.detail(ev, { onDone });
    });
  },
};

/* ---------------------------------------------------------------- Lugares */
const PlacesUI = {
  cuposState(p) {
    if (!p.proximas.length) return { cls: 'badge-neutral', text: 'Sin actividades próximas', bar: 'ok' };
    if (p.cuposDisponibles <= 0) return { cls: 'badge-danger', text: 'Sin cupos', bar: 'full' };
    if (p.cuposDisponibles / Math.max(1, p.cuposTotales) <= 0.25) return { cls: 'badge-warning', text: `Últimos ${p.cuposDisponibles} cupos`, bar: 'low' };
    return { cls: 'badge-success', text: `${p.cuposDisponibles} cupos disponibles`, bar: 'ok' };
  },

  cardHTML(p) {
    const st = this.cuposState(p);
    const usados = p.cuposTotales - p.cuposDisponibles;
    const next = p.proximas[0];
    return `
      <article class="card place-card card-hover" data-id="${esc(p.id)}">
        <div class="place-media">
          <img src="${esc(p.imagen)}" alt="Foto de referencia (UNAB) para ${esc(p.nombre)}" loading="lazy" onerror="this.style.visibility='hidden'">
          <span class="badge badge-dark place-cat">${icon(categoriaIcon(p.categoria), 'icon-sm')} ${esc(p.categoria)}</span>
        </div>
        <div class="place-body">
          <div class="row-between">
            <h3>${esc(p.nombre)}</h3>
            <span class="badge ${st.cls}">${esc(st.text)}</span>
          </div>
          <p class="muted small place-desc">${esc(p.descripcion)}</p>
          <ul class="place-meta">
            <li>${icon('pin', 'icon-sm')}<span>${esc(p.ubicacion)}</span></li>
            <li>${icon('calendar', 'icon-sm')}<span>${plural(p.proximas.length, 'actividad próxima', 'actividades próximas')}${next ? ` · siguiente: <strong>${esc(next.titulo)}</strong>` : ''}</span></li>
            <li>${icon('ribbon', 'icon-sm')}<span>${p.horasMax ? `Hasta ${plural(p.horasMax, 'hora libre', 'horas libres')} por actividad` : '—'}</span></li>
          </ul>
          ${p.cuposTotales ? `
          <div class="cupos">
            <div class="row-between xsmall"><span class="muted">Ocupación de las próximas actividades</span><strong>${usados}/${p.cuposTotales}</strong></div>
            <div class="progress cupos-bar ${st.bar}"><div class="progress-bar" data-width="${(usados / p.cuposTotales) * 100}%"></div></div>
          </div>` : ''}
          <div class="place-actions">
            <button class="btn btn-outline" type="button" data-action="detail" data-id="${esc(p.id)}">Ver actividades</button>
            <button class="btn btn-primary" type="button" data-action="enroll" data-id="${esc(p.id)}" ${p.cuposDisponibles <= 0 ? 'disabled aria-disabled="true"' : ''}>
              ${p.cuposDisponibles <= 0 ? 'Sin cupos' : `${icon('plus', 'icon-sm')} Inscribirme`}
            </button>
          </div>
        </div>
      </article>`;
  },

  /** Detalle del lugar con su agenda de próximas actividades. */
  detail(p, events, { onDone } = {}) {
    const st = this.cuposState(p);
    const list = events.filter((e) => e.placeId === p.id && Rules.isUpcoming(e)).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
    const m = Modal.open({
      title: p.nombre, iconName: categoriaIcon(p.categoria), size: 'modal-wide',
      body: `
        <img class="detail-img" src="${esc(p.imagen)}" alt="Foto de referencia (UNAB) para ${esc(p.nombre)}">
        <div class="row" style="margin:14px 0 10px">
          <span class="badge badge-dark">${esc(p.categoria)}</span><span class="badge ${st.cls}">${esc(st.text)}</span>
        </div>
        <p>${esc(p.descripcion)}</p>
        <p class="small muted">${icon('pin', 'icon-sm')} ${esc(p.ubicacion)}</p>
        <h3 class="small" style="margin-top:16px">Próximas actividades</h3>
        <div class="event-list">${list.length ? list.map((e) => EventsUI.rowHTML(e, { compact: true })).join('') : '<p class="small muted">No hay actividades programadas en este lugar.</p>'}</div>`,
      actions: [{ label: 'Cerrar', class: 'btn-outline', value: null }],
    });
    EventsUI.bind(m.el, () => events, () => { m.close(); onDone && onDone(); });
  },

  /** Inscripción desde un lugar: elegir una de sus próximas actividades. */
  enroll(p, events, { onDone } = {}) {
    const list = events.filter((e) => e.placeId === p.id && Rules.isUpcoming(e) && !e.miEstado && e.cuposDisponibles > 0)
      .sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
    if (!list.length) { Toast.error('No hay actividades con cupo disponibles en este lugar.'); return; }
    const m = Modal.open({
      title: `Inscripción en ${p.nombre}`, iconName: 'certificate',
      body: `
        <p class="muted small">Elige la actividad. Al confirmar se descuenta un cupo y aparecerá en <strong>Mis inscripciones</strong>.</p>
        <fieldset class="field slot-field"><legend class="label">Actividades disponibles</legend>
        <div class="slots slots-list">${list.map((e, i) => {
          const d = parseISODate(e.fecha);
          return `<label class="slot"><input type="radio" name="enEv" value="${esc(e.id)}" ${i === 0 ? 'checked' : ''}>
            <span><strong>${esc(e.titulo)}</strong><small>${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]} · ${formatRange(e.inicio, e.fin)} · +${e.horas} HL · ${e.cuposDisponibles} cupos</small></span></label>`;
        }).join('')}</div></fieldset>`,
      actions: [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        { html: `${icon('check', 'icon-sm')} Confirmar inscripción`, class: 'btn-primary', id: 'enConfirm', onClick: async ({ close, button, root }) => {
          const sel = $('input[name="enEv"]:checked', root);
          const ev = list.find((x) => x.id === sel.value);
          FormUI.setLoading(button, true, 'Inscribiendo…');
          try {
            await API.call('enroll', { eventId: ev.id });
            close(true);
            Toast.success(`¡Listo! Quedaste inscrito en “${ev.titulo}”.`);
            await App.refreshSummary();
            onDone && onDone();
          } catch (err) { FormUI.setLoading(button, false); Toast.error(err.message); }
        } },
      ],
    });
    return m.result;
  },
};

/** Tarjeta de sugerencia (usada en inicio.html y horario.html). */
function suggestionHTML(ev) {
  const d = parseISODate(ev.fecha);
  return `
    <div class="suggest">
      <div class="kpi-icon">${icon(categoriaIcon(ev.categoria))}</div>
      <div class="grow">
        <strong class="small">${esc(ev.titulo)}</strong>
        <div class="xsmall muted">${DIAS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]} · ${formatRange(ev.inicio, ev.fin)} · ${esc(ev.lugar)} · +${ev.horas} HL</div>
      </div>
      <button class="btn btn-sm btn-outline" type="button" data-enroll-event="${esc(ev.id)}" aria-label="Inscribirme en ${esc(ev.titulo)}">Inscribirme</button>
    </div>`;
}
