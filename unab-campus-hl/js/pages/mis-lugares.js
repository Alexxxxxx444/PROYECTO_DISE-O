/* ==========================================================================
   Página: Mis inscripciones (mis-lugares.html)
   Flujo igual a MiPortalU:
     presencial → Generar código QR → escaneo en el evento
     virtual    → Confirmar asistencia
     ambas      → Responder encuesta (6 preguntas) → Completada (+HL)
   F04 cancelación con confirmación (libera el cupo).
   ========================================================================== */
(async function () {
  await App.init({ page: 'mis-lugares', title: 'Mis inscripciones', crumb: 'Bienestar Universitario · Horas libres' });

  let enrollments = [];
  const ACTIVOS = ['inscrita', 'asistencia'];
  const TABS = [
    { key: 'activas', label: 'Activas', test: (e) => ACTIVOS.includes(e.estado) },
    { key: 'completadas', label: 'Completadas', test: (e) => e.estado === 'completada' },
    { key: 'canceladas', label: 'Canceladas', test: (e) => e.estado === 'cancelada' },
    { key: 'todas', label: 'Todas', test: () => true },
  ];
  let tab = TABS.some((t) => t.key === getParam('estado')) ? getParam('estado') : 'activas';

  const load = async () => { enrollments = (await API.call('enrollments')).enrollments; };
  const find = (id) => enrollments.find((x) => x.id === id);

  const renderStats = () => {
    const act = enrollments.filter((e) => ACTIVOS.includes(e.estado));
    const pend = act.filter((e) => e.estado === 'asistencia' || e.fecha <= todayISO());
    const stats = [
      ['Activas', act.length, 'certificate', ''],
      ['Por registrar o encuesta', pend.length, 'notepad', 'warning'],
      ['Completadas', enrollments.filter((e) => e.estado === 'completada').length, 'checkCircle', 'success'],
      ['Horas libres en curso', act.reduce((a, e) => a + Number(e.horas), 0), 'ribbon', 'dark'],
    ];
    $('#enStats').innerHTML = stats.map(([l, v, ic, c]) => `<div class="card kpi"><div class="kpi-icon ${c}">${icon(ic)}</div><div><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div></div></div>`).join('');
  };

  const renderTabs = () => {
    $('#enTabs').innerHTML = TABS.map((t) => `<button type="button" class="chip" role="tab" id="tab-${t.key}" aria-selected="${tab === t.key}" data-tab="${t.key}">${t.label}<span class="count">${enrollments.filter(t.test).length}</span></button>`).join('');
    $('#enList').setAttribute('aria-labelledby', `tab-${tab}`);
  };

  /** Pasos del registro de la actividad (indicador visual). */
  const stepsHTML = (e) => {
    const steps = [e.modalidad === 'virtual' ? 'Confirmar asistencia' : 'Código QR', 'Encuesta', 'Completada'];
    const done = e.estado === 'completada' ? 3 : e.estado === 'asistencia' ? 1 : 0;
    return `<ol class="reg-steps" aria-label="Progreso del registro">${steps.map((s, i) => `<li class="${i < done ? 'done' : i === done && e.estado !== 'cancelada' ? 'current' : ''}">${s}</li>`).join('')}</ol>`;
  };

  const actionsHTML = (e) => {
    const can = e.fecha <= todayISO();
    if (e.estado === 'inscrita' && e.modalidad === 'presencial') return `
      <button class="btn btn-sm btn-primary" type="button" data-qr="${esc(e.id)}">${icon('card', 'icon-sm')} ${e.qr ? 'Ver código QR' : 'Generar código QR'}</button>
      <button class="btn btn-sm btn-danger-outline" type="button" data-cancel="${esc(e.id)}">${icon('x', 'icon-sm')} Cancelar</button>`;
    if (e.estado === 'inscrita') return `
      <button class="btn btn-sm ${can ? 'btn-success' : 'btn-outline'}" type="button" data-confirm="${esc(e.id)}" ${can ? '' : 'disabled title="Disponible el día de la actividad"'}>${icon('check', 'icon-sm')} Confirmar asistencia</button>
      <button class="btn btn-sm btn-danger-outline" type="button" data-cancel="${esc(e.id)}">${icon('x', 'icon-sm')} Cancelar</button>`;
    if (e.estado === 'asistencia') return `<button class="btn btn-sm btn-primary" type="button" data-survey="${esc(e.id)}">${icon('notepad', 'icon-sm')} Responder encuesta</button>`;
    if (e.estado === 'completada') return `<span class="small muted">Sumó ${plural(Number(e.horas), 'hora libre', 'horas libres')}</span>`;
    return `<a class="btn btn-sm btn-outline" href="cronograma.html?q=${encodeURIComponent(e.titulo || '')}">Buscar en la agenda</a>`;
  };

  const itemHTML = (e) => {
    const d = parseISODate(e.fecha);
    return `
      <article class="enroll-item ${e.estado}" data-id="${esc(e.id)}">
        <div class="date-chip lg"><small>${DIAS_CORTOS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MESES_CORTOS[d.getMonth()]}</small></div>
        <div class="enroll-main">
          <div class="row" style="gap:8px"><h3>${esc(e.titulo)}</h3>${estadoBadge(e)}</div>
          <ul class="place-meta inline">
            <li>${icon('clock', 'icon-sm')}<span>${formatRange(e.inicio, e.fin)}</span></li>
            <li>${icon(e.modalidad === 'virtual' ? 'laptop' : 'pin', 'icon-sm')}<span>${esc(e.lugar || '')}</span></li>
            <li>${icon('ribbon', 'icon-sm')}<span>${plural(Number(e.horas), 'hora libre', 'horas libres')}</span></li>
          </ul>
          ${e.estado !== 'cancelada' ? stepsHTML(e) : ''}
        </div>
        <div class="enroll-actions">${actionsHTML(e)}</div>
      </article>`;
  };

  const renderList = () => {
    const t = TABS.find((x) => x.key === tab);
    let list = enrollments.filter(t.test);
    if (tab === 'activas') list = [...list].sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
    $('#enList').innerHTML = list.length ? list.map(itemHTML).join('') : `
      <div class="empty">
        <div class="empty-icon">${icon('certificate', 'icon-lg')}</div>
        <h3>${tab === 'activas' ? 'No tienes inscripciones activas' : `No hay inscripciones ${t.label.toLowerCase()}`}</h3>
        <p>Revisa la agenda de Bienestar y elige una actividad con cupos.</p>
        <a class="btn btn-primary btn-sm" href="cronograma.html">Ver agenda de actividades</a>
      </div>`;
  };

  const renderAll = () => { renderStats(); renderTabs(); renderList(); };
  const refresh = async () => { await Promise.all([load(), App.refreshSummary()]); renderAll(); };

  /* ---------- Código QR (presencial) ---------- */
  const qrSVG = (text) => {
    try {
      const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
      return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    } catch (err) { return `<div class="qr-fallback">${icon('card', 'icon-lg')}</div>`; }
  };
  const openQR = async (id) => {
    let e = find(id);
    try { if (!e.qr) { e = (await API.call('qr', { id })).enrollment; await load(); } } catch (err) { Toast.error(err.message); return; }
    const can = e.fecha <= todayISO();
    Modal.open({
      title: 'Tu código QR', iconName: 'card',
      body: `
        <p class="muted small">Presenta este código al ingresar a <strong>${esc(e.titulo)}</strong>. El personal de Bienestar lo escanea para registrar tu asistencia.</p>
        <div class="qr-box">${qrSVG(`${e.qr}|${App.user.codigo}|${e.eventId}`)}<code>${esc(e.qr)}</code></div>
        <p class="xsmall muted">${DIAS[parseISODate(e.fecha).getDay()]} ${formatDate(e.fecha)} · ${formatRange(e.inicio, e.fin)} · ${esc(e.lugar)}</p>
        <div class="alert">${icon('info', 'icon-sm')}<span><strong>Demostración:</strong> como no hay lector real, el botón simula el escaneo en el evento${can ? '' : ' (se habilita el día de la actividad)'}.</span></div>`,
      actions: [
        { label: 'Cerrar', class: 'btn-outline', value: null },
        { html: `${icon('check', 'icon-sm')} Simular escaneo`, class: can ? 'btn-success' : 'btn-outline', onClick: async ({ close, button }) => {
          if (!can) { Toast.error('La asistencia se registra el día de la actividad.'); return; }
          FormUI.setLoading(button, true, 'Registrando…');
          try { await API.call('attend', { id }); close(true); Toast.success('Asistencia registrada. Ahora responde la encuesta para sumar tus horas.'); await refresh(); openSurvey(id); }
          catch (err) { FormUI.setLoading(button, false); Toast.error(err.message); }
        } },
      ],
    });
  };

  /* ---------- Encuesta de satisfacción (6 preguntas) ---------- */
  const PREGUNTAS = [
    '¿Cómo calificas la organización de la actividad?',
    '¿Qué tan útil fue para tu formación integral?',
    '¿Cómo calificas al facilitador o tallerista?',
    '¿El horario de la actividad fue adecuado?',
    '¿Cómo calificas el lugar o la plataforma virtual?',
  ];
  const openSurvey = (id) => {
    const e = find(id);
    const m = Modal.open({
      title: 'Encuesta de satisfacción', iconName: 'notepad', size: 'modal-wide',
      body: `
        <p class="muted small">${esc(e.titulo)} · Responde las 6 preguntas para que se registren tus <strong>${plural(Number(e.horas), 'hora libre', 'horas libres')}</strong>.</p>
        <form id="surveyForm" class="survey" novalidate>
          ${PREGUNTAS.map((q, i) => `
            <fieldset class="survey-q"><legend>${i + 1}. ${q}</legend>
              <div class="rating">${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="p${i + 1}" value="${v}"><span>${v}</span></label>`).join('')}</div>
              <div class="rating-legend xsmall muted"><span>Muy malo</span><span>Excelente</span></div>
            </fieldset>`).join('')}
          <fieldset class="survey-q"><legend>6. ¿Recomendarías esta actividad a otros estudiantes?</legend>
            <div class="rating yn"><label><input type="radio" name="p6" value="si"><span>Sí</span></label><label><input type="radio" name="p6" value="no"><span>No</span></label></div>
          </fieldset>
          <div class="field"><label for="sCom">Comentario <span class="muted small">(opcional)</span></label><textarea class="textarea" id="sCom" maxlength="300"></textarea></div>
          <div id="sErr"></div>
        </form>`,
      actions: [
        { label: 'Después', class: 'btn-outline', value: null },
        { html: `${icon('check', 'icon-sm')} Enviar encuesta`, class: 'btn-primary', onClick: async ({ close, button, root }) => {
          const r = {}; for (let i = 1; i <= 6; i++) r[`p${i}`] = $(`input[name="p${i}"]:checked`, root)?.value;
          r.comentario = $('#sCom', root).value.trim();
          if (Object.entries(r).some(([k, v]) => k !== 'comentario' && !v)) {
            $('#sErr', root).innerHTML = `<div class="alert alert-danger">${icon('alert', 'icon-sm')}<span>Responde todas las preguntas.</span></div>`; return;
          }
          FormUI.setLoading(button, true, 'Enviando…');
          try {
            await API.call('survey', { id, respuestas: r });
            close(true);
            const s = await App.refreshSummary();
            Toast.success(`¡Actividad completada! +${e.horas} HL. Tu avance es del ${s ? s.porcentaje : '—'}%.`);
            await load(); renderAll();
          } catch (err) { FormUI.setLoading(button, false); Toast.error(err.message); }
        } },
      ],
    });
    return m;
  };

  /* ---------- Acciones ---------- */
  $('#enTabs').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderTabs(); renderList(); });
  $('#enList').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-cancel], button[data-qr], button[data-confirm], button[data-survey]');
    if (!b || b.disabled) return;
    if (b.dataset.qr) return openQR(b.dataset.qr);
    if (b.dataset.survey) return openSurvey(b.dataset.survey);
    if (b.dataset.confirm) {
      const e = find(b.dataset.confirm);
      const ok = await Modal.confirm({ title: 'Confirmar asistencia', iconName: 'checkCircle', confirmText: 'Confirmar asistencia', message: `Confirma que te conectaste a <strong>${esc(e.titulo)}</strong>. Después responde la encuesta para sumar tus horas.` });
      if (!ok) return;
      try { await API.call('attend', { id: e.id }); Toast.success('Asistencia confirmada.'); await refresh(); openSurvey(e.id); } catch (err) { Toast.error(err.message); }
      return;
    }
    const e = find(b.dataset.cancel);
    const ok = await Modal.confirm({
      title: '¿Cancelar esta inscripción?', danger: true, confirmText: 'Sí, cancelar', cancelText: 'Mantener inscripción',
      message: `Se cancelará tu inscripción en <strong>${esc(e.titulo)}</strong> (${formatDate(e.fecha, { weekday: true })}, ${formatRange(e.inicio, e.fin)}). El cupo quedará disponible para otros estudiantes.`,
    });
    if (!ok) return;
    try { await API.call('cancel', { id: e.id }); Toast.success('Inscripción cancelada. El cupo fue liberado.'); await refresh(); } catch (err) { Toast.error(err.message); }
  });

  await load();
  renderAll();
  if (getParam('encuesta')) { const e = find(getParam('encuesta')); if (e && e.estado === 'asistencia') openSurvey(e.id); }
})();
