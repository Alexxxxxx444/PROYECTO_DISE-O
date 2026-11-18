/* ==========================================================================
   Página: Horario semanal del estudiante (horario.html)
   F07 — clases, espacios libres y sugerencias de turnos de Horas Libres
   ========================================================================== */
(async function () {
  await App.init({ page: 'horario', title: 'Horario semanal', crumb: 'Organización' });

  const HOUR_PX = 52;
  const START = CONFIG.HORARIO_INICIO, END = CONFIG.HORARIO_FIN;
  let classes = [], events = [], enrollments = [];

  // Semana mostrada: lunes a sábado de la semana actual (si es domingo, la siguiente)
  const today = new Date();
  const monday = addDays(today, today.getDay() === 0 ? 1 : 1 - today.getDay());
  const weekDates = [1, 2, 3, 4, 5, 6].map((d) => addDays(monday, d - 1));

  const load = async () => {
    [classes, events, enrollments] = await Promise.all([
      API.call('classes').then((r) => r.classes),
      API.call('events').then((r) => r.events),
      API.call('enrollments').then((r) => r.enrollments),
    ]);
  };

  const top = (hhmm) => ((toMinutes(hhmm) - START * 60) / 60) * HOUR_PX;
  const height = (a, b) => ((toMinutes(b) - toMinutes(a)) / 60) * HOUR_PX;

  /* ---------- Rejilla ---------- */
  const renderGrid = () => {
    const hours = []; for (let h = START; h < END; h++) hours.push(h);
    const head = `<div class="sch-corner"></div>` + weekDates.map((d) => {
      const isToday = toISODate(d) === todayISO();
      return `<div class="sch-day ${isToday ? 'today' : ''}" role="columnheader"><span>${DIAS_CORTOS[d.getDay()]}</span><b>${d.getDate()}</b></div>`;
    }).join('');
    const times = `<div class="sch-times">${hours.map((h) => `<div style="height:${HOUR_PX}px"><span>${formatHour(`${String(h).padStart(2, '0')}:00`).replace(':00', '')}</span></div>`).join('')}</div>`;
    const cols = weekDates.map((d) => {
      const dia = d.getDay(); const iso = toISODate(d);
      const gaps = Rules.freeGaps(classes, dia).map(([a, b]) => {
        const ia = fromMinutes(a), ib = fromMinutes(b);
        return `<button type="button" class="sch-free" style="top:${top(ia)}px;height:${height(ia, ib)}px" data-gap="${iso}|${ia}|${ib}" aria-label="Espacio libre el ${DIAS[dia]} de ${ia} a ${ib}. Ver turnos disponibles"><span>Libre · ${((b - a) / 60).toString().replace('.', ',')} h</span></button>`;
      }).join('');
      const cls = classes.filter((c) => c.dia === dia).map((c) => `
        <button type="button" class="sch-block class" style="top:${top(c.inicio)}px;height:${height(c.inicio, c.fin)}px" data-class="${esc(c.id)}" aria-label="Clase ${esc(c.materia)}, ${c.inicio} a ${c.fin}">
          <strong>${esc(c.materia)}</strong><span>${c.inicio}–${c.fin}${c.salon ? ` · ${esc(c.salon)}` : ''}</span>
        </button>`).join('');
      const ens = enrollments.filter((e) => ['inscrita', 'asistencia'].includes(e.estado) && e.fecha === iso)
        .filter((e) => toMinutes(e.inicio) < END * 60 && toMinutes(e.fin) > START * 60).map((e) => {
          const a = toMinutes(e.inicio) < START * 60 ? `${String(START).padStart(2, '0')}:00` : e.inicio;
          const b = toMinutes(e.fin) > END * 60 ? `${END}:00` : e.fin;
          return `
        <a class="sch-block enroll" href="mis-lugares.html" style="top:${top(a)}px;height:${height(a, b)}px" aria-label="Inscripción: ${esc(e.titulo)}, ${e.inicio} a ${e.fin}">
          <strong>${esc(e.titulo)}</strong><span>${e.inicio}–${e.fin}</span>
        </a>`; }).join('');
      const nowLine = iso === todayISO() && today.getHours() >= START && today.getHours() < END
        ? `<div class="sch-now" style="top:${(((today.getHours() * 60 + today.getMinutes()) - START * 60) / 60) * HOUR_PX}px"></div>` : '';
      return `<div class="sch-col ${iso === todayISO() ? 'today' : ''}" style="height:${(END - START) * HOUR_PX}px">${hours.map(() => `<div class="sch-line" style="height:${HOUR_PX}px"></div>`).join('')}${gaps}${cls}${ens}${nowLine}</div>`;
    }).join('');
    $('#schedule').innerHTML = `<div class="sch-head">${head}</div><div class="sch-body">${times}${cols}</div>`;
  };

  /* ---------- Sugerencias ---------- */
  const renderSuggestions = () => {
    const box = $('#suggestList');
    if (!classes.length) { box.innerHTML = '<p class="small muted">Agrega tus clases o carga el horario de ejemplo para recibir sugerencias.</p>'; return; }
    const sug = Rules.suggestions(events, classes, enrollments, 6);
    box.innerHTML = sug.length ? sug.map(suggestionHTML).join('') : '<p class="small muted">No hay actividades libres que encajen esta semana.</p>';
  };

  /* ---------- Lista de clases ---------- */
  const renderClasses = () => {
    const sorted = [...classes].sort((a, b) => (a.dia - b.dia) || a.inicio.localeCompare(b.inicio));
    $('#classCount').textContent = plural(classes.length, 'clase', 'clases');
    $('#classList').innerHTML = sorted.length ? sorted.map((c) => `
      <li class="list-item">
        <span class="class-day">${DIAS_CORTOS[c.dia]}</span>
        <div class="grow"><strong class="small">${esc(c.materia)}</strong><div class="xsmall muted">${c.inicio}–${c.fin}${c.salon ? ` · ${esc(c.salon)}` : ''}</div></div>
        <button class="icon-btn sm" type="button" data-del="${esc(c.id)}" aria-label="Eliminar ${esc(c.materia)} del ${DIAS[c.dia]}">${icon('trash', 'icon-sm')}</button>
      </li>`).join('') : '<li class="small muted" style="padding:12px 0">Aún no has agregado clases.</li>';
    $('#demoClassesBtn').classList.toggle('hidden', classes.length > 0 && !App.user.demo);
  };

  const renderAll = () => { renderGrid(); renderSuggestions(); renderClasses(); };
  const refresh = async () => { await load(); renderAll(); };

  /* ---------- CRUD de clases ---------- */
  const deleteClass = async (id) => {
    const c = classes.find((x) => x.id === id);
    const ok = await Modal.confirm({ title: '¿Eliminar clase?', danger: true, confirmText: 'Eliminar', message: `Se quitará <strong>${esc(c.materia)}</strong> (${DIAS[c.dia]} ${c.inicio}–${c.fin}) de tu horario.` });
    if (!ok) return;
    try { await API.call('deleteClass', { id }); Toast.success('Clase eliminada del horario.'); await refresh(); } catch (e) { Toast.error(e.message); }
  };

  const openAdd = (preset = {}) => {
    const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`;
    const times = []; for (let m = START * 60; m <= END * 60; m += 30) times.push(fromMinutes(m));
    const m = Modal.open({
      title: 'Agregar clase', iconName: 'calendar',
      body: `
        <form id="classForm" novalidate>
          <div class="field"><label for="cMateria">Asignatura</label><input class="input" id="cMateria" maxlength="80" placeholder="Ej.: Cálculo Integral" autofocus><span class="field-error"></span></div>
          <div class="field"><label for="cSalon">Salón <span class="muted small">(opcional)</span></label><input class="input" id="cSalon" maxlength="40" placeholder="Ej.: Aula 101"></div>
          <div class="form-grid three">
            <div class="field"><label for="cDia">Día</label><select class="select" id="cDia">${[1, 2, 3, 4, 5, 6].map((d) => `<option value="${d}" ${preset.dia === d ? 'selected' : ''}>${DIAS[d]}</option>`).join('')}</select></div>
            <div class="field"><label for="cIni">Inicio</label><select class="select" id="cIni">${times.slice(0, -1).map((t) => opt(t, preset.inicio || '07:00')).join('')}</select></div>
            <div class="field"><label for="cFin">Fin</label><select class="select" id="cFin">${times.slice(1).map((t) => opt(t, preset.fin || '09:00')).join('')}</select></div>
          </div>
          <div id="cErr"></div>
        </form>`,
      actions: [
        { label: 'Cancelar', class: 'btn-outline', value: null },
        { html: `${icon('plus', 'icon-sm')} Agregar`, class: 'btn-primary', onClick: async ({ close, button, root }) => {
          const materia = $('#cMateria', root);
          if (!FormUI.setState(materia, materia.value.trim().length < 2 ? 'Escribe el nombre de la asignatura.' : '')) return;
          FormUI.setLoading(button, true, 'Guardando…');
          try {
            await API.call('addClass', { materia: materia.value, salon: $('#cSalon', root).value, dia: Number($('#cDia', root).value), inicio: $('#cIni', root).value, fin: $('#cFin', root).value });
            close(true); Toast.success('Clase agregada a tu horario.'); await refresh();
          } catch (e) {
            FormUI.setLoading(button, false);
            $('#cErr', root).innerHTML = `<div class="alert alert-danger">${icon('alert', 'icon-sm')}<span>${esc(e.message)}</span></div>`;
          }
        } },
      ],
    });
    return m;
  };

  /* ---------- Turnos que caben en un espacio libre ---------- */
  const openGap = (iso, a, b) => {
    const d = parseISODate(iso);
    const opts = events.filter((ev) => ev.fecha === iso && toMinutes(ev.inicio) >= toMinutes(a) && toMinutes(ev.fin) <= toMinutes(b))
      .sort((x, y) => x.inicio.localeCompare(y.inicio));
    const m = Modal.open({
      title: `Espacio libre · ${DIAS[d.getDay()]} ${d.getDate()}`, iconName: 'sparkle',
      body: `<p class="muted small">De ${formatHour(a)} a ${formatHour(b)}. ${opts.length ? 'Actividades de Bienestar que encajan en este espacio:' : ''}</p>
        ${opts.length ? `<div class="event-list">${opts.map((e) => EventsUI.rowHTML(e, { compact: true })).join('')}</div>`
        : `<div class="empty compact"><p class="small">No hay actividades de Horas Libres en este espacio${iso < todayISO() ? ' (la fecha ya pasó)' : ''}.</p><a class="btn btn-sm btn-outline" href="cronograma.html">Ver agenda</a></div>`}`,
      actions: [
        { label: 'Cerrar', class: 'btn-outline', value: null },
        { html: `${icon('plus', 'icon-sm')} Agregar clase aquí`, class: 'btn-ghost', onClick: ({ close }) => { close(); openAdd({ dia: d.getDay(), inicio: a, fin: fromMinutes(Math.min(toMinutes(a) + 120, toMinutes(b))) }); } },
      ],
    });
    EventsUI.bind(m.el, () => events, () => { m.close(); refresh(); });
  };

  /* ---------- Eventos ---------- */
  $('#addClassBtn').addEventListener('click', () => openAdd());
  $('#demoClassesBtn').addEventListener('click', async () => {
    if (classes.length) {
      const ok = await Modal.confirm({ title: '¿Reemplazar tu horario?', message: 'Se borrarán tus clases actuales y se cargará un horario de ejemplo con asignaturas ficticias.', confirmText: 'Reemplazar', danger: true });
      if (!ok) return;
    }
    try { await API.call('loadDemoClasses'); Toast.success('Horario de ejemplo cargado.'); await refresh(); } catch (e) { Toast.error(e.message); }
  });
  EventsUI.bind($('#suggestList'), () => events, refresh);
  $('#classList').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) deleteClass(b.dataset.del); });
  $('#schedule').addEventListener('click', (e) => {
    const c = e.target.closest('[data-class]');
    if (c) {
      const cl = classes.find((x) => x.id === c.dataset.class);
      Modal.open({
        title: cl.materia, iconName: 'book',
        body: `<dl class="info-list"><div><dt>Día</dt><dd>${DIAS[cl.dia]}</dd></div><div><dt>Horario</dt><dd>${formatRange(cl.inicio, cl.fin)}</dd></div><div><dt>Salón</dt><dd>${esc(cl.salon || 'Sin especificar')}</dd></div></dl>`,
        actions: [
          { html: `${icon('trash', 'icon-sm')} Eliminar`, class: 'btn-danger-outline', onClick: ({ close }) => { close(); deleteClass(cl.id); } },
          { label: 'Cerrar', class: 'btn-primary', value: null },
        ],
      });
      return;
    }
    const g = e.target.closest('[data-gap]');
    if (g) { const [iso, a, b] = g.dataset.gap.split('|'); openGap(iso, a, b); }
  });

  await load();
  renderAll();
  // Desplaza la rejilla hasta las 7 a. m. en pantallas pequeñas
  $('.schedule-scroll').scrollTop = HOUR_PX;
})();
