/* ==========================================================================
   Página: Panel principal / Dashboard (inicio.html)
   ========================================================================== */
(async function () {
  const user = await App.init({ page: 'inicio', title: 'Inicio', crumb: 'Panel del estudiante' });

  let [enrollments, events, classes] = await Promise.all([
    API.call('enrollments').then((r) => r.enrollments),
    API.call('events').then((r) => r.events),
    API.call('classes').then((r) => r.classes),
  ]);
  let s = App.summary;

  /* ---------- Bienvenida ---------- */
  $('#todayLabel').textContent = formatLongToday();
  $('#userFirst').textContent = firstName(user.nombre);
  $('#welcomeMsg').innerHTML = s.pendientes > 0
    ? `Llevas <strong>${s.cumplidas} de ${s.requeridas}</strong> Horas Libres. Te faltan <strong>${plural(s.pendientes, 'hora', 'horas')}</strong> para cumplir el requisito de grado.`
    : '¡Felicitaciones! Completaste tus Horas Libres. Ya puedes generar tu constancia.';
  $('#welcomeRing').innerHTML = ringHTML(s.porcentaje, 'cumplido');

  /* ---------- Avisos pendientes (estilo MiPortalU) ---------- */
  const renderPending = () => {
    const encuestas = enrollments.filter((e) => e.estado === 'asistencia');
    const registrar = enrollments.filter((e) => e.estado === 'inscrita' && e.fecha <= todayISO());
    const parts = [];
    if (encuestas.length) parts.push(`<a href="mis-lugares.html?encuesta=${esc(encuestas[0].id)}"><strong>${plural(encuestas.length, 'encuesta pendiente', 'encuestas pendientes')}</strong></a> para sumar tus horas`);
    if (registrar.length) parts.push(`<a href="mis-lugares.html"><strong>${plural(registrar.length, 'actividad', 'actividades')}</strong></a> por registrar asistencia`);
    $('#pendingBanner').innerHTML = parts.length ? `<div class="alert pending">${icon('bell', 'icon-sm')}<span>Tienes ${parts.join(' y ')}.</span></div>` : '';
  };
  renderPending();

  /* ---------- KPI ---------- */
  const renderKpis = () => {
    const kpis = [
      { label: 'Horas requeridas', value: s.requeridas, icon: 'graduation', cls: 'dark' },
      { label: 'Horas cumplidas', value: s.cumplidas, icon: 'checkCircle', cls: 'success' },
      { label: 'Horas pendientes', value: s.pendientes, icon: 'hourglass', cls: 'warning' },
      { label: 'Inscripciones activas', value: s.activas, icon: 'certificate', cls: '' },
    ];
    $('#kpis').innerHTML = kpis.map((k) => `
      <div class="card kpi"><div class="kpi-icon ${k.cls}">${icon(k.icon)}</div>
      <div><div class="kpi-value" data-count="${k.value}">0</div><div class="kpi-label">${k.label}</div></div></div>`).join('');
    $$('#kpis [data-count]').forEach((el) => countUp(el, Number(el.dataset.count)));
  };
  renderKpis();

  /* ---------- Progreso (F01) y horas por tipo ---------- */
  $('#progressBlock').innerHTML = `
    <div class="row-between small" style="margin-bottom:8px"><strong>${s.porcentaje}% completado</strong><span class="muted">${s.cumplidas} / ${s.requeridas} h</span></div>
    <div class="progress progress-lg ${s.porcentaje >= 100 ? 'complete' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.porcentaje}" aria-label="Avance de Horas Libres">
      <div class="progress-bar" data-width="${s.porcentaje}%"></div></div>`;
  const max = Math.max(1, ...s.porCategoria.map((p) => p.horas));
  $('#byCat').innerHTML = s.porCategoria.map((p) => `
    <div class="hbar">
      <span class="hbar-label">${icon(categoriaIcon(p.categoria), 'icon-sm')} ${esc(p.categoria)}</span>
      <div class="hbar-track"><div class="hbar-fill" data-width="${(p.horas / max) * 100}%"></div></div>
      <span class="hbar-value">${p.horas} h</span>
    </div>`).join('');

  /* ---------- Mis próximas actividades ---------- */
  const renderUpcoming = () => {
    const up = enrollments.filter((e) => ['inscrita', 'asistencia'].includes(e.estado)).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)).slice(0, 4);
    $('#upcomingList').innerHTML = up.length ? up.map((e) => {
      const d = parseISODate(e.fecha);
      return `
        <li class="list-item">
          <div class="date-chip"><small>${MESES_CORTOS[d.getMonth()]}</small><b>${d.getDate()}</b></div>
          <div class="grow"><strong class="small">${esc(e.titulo)}</strong>
            <div class="xsmall muted">${DIAS[d.getDay()]} · ${formatRange(e.inicio, e.fin)} · ${esc(e.lugar)}</div></div>
          ${estadoBadge(e)}
        </li>`;
    }).join('') : `
      <li class="empty compact"><div class="empty-icon">${icon('calendar', 'icon-lg')}</div>
        <p class="small">No tienes actividades próximas.</p><a class="btn btn-sm btn-primary" href="cronograma.html">Ver agenda</a></li>`;
  };

  /* ---------- Agenda (próximas 5 actividades con cupo) ---------- */
  const renderAgenda = () => {
    const next = events.filter((e) => Rules.isUpcoming(e)).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)).slice(0, 5);
    $('#agendaList').innerHTML = next.map((e) => EventsUI.rowHTML(e, { compact: true })).join('') || '<p class="small muted">No hay actividades programadas.</p>';
  };

  /* ---------- Sugerencias según horario (F07) ---------- */
  const renderSuggest = () => {
    const box = $('#suggestList');
    if (!classes.length) { box.innerHTML = '<p class="small muted">Agrega tus clases en el horario semanal para recibir sugerencias.</p><a class="btn btn-sm btn-outline" href="horario.html">Configurar horario</a>'; return; }
    const sug = Rules.suggestions(events, classes, enrollments, 3);
    box.innerHTML = sug.length ? sug.map(suggestionHTML).join('') : '<p class="small muted">No hay actividades libres que encajen esta semana.</p>';
  };

  const reload = async () => {
    [enrollments, events] = await Promise.all([API.call('enrollments').then((r) => r.enrollments), API.call('events').then((r) => r.events)]);
    s = App.summary; renderKpis(); renderPending(); renderUpcoming(); renderAgenda(); renderSuggest();
  };
  EventsUI.bind($('#agendaList'), () => events, reload);
  EventsUI.bind($('#suggestList'), () => events, reload);
  renderUpcoming(); renderAgenda(); renderSuggest();

  /* ---------- Servicios UNAB (enlaces institucionales) ---------- */
  const L = CONFIG.LINKS;
  $('#services').innerHTML = [
    ['MiPortalU', L.miportalu, 'student'], ['Correo', L.correo, 'mail'], ['Cosmos', L.cosmos, 'laptop'],
    ['Biblioteca', L.biblioteca, 'book'], ['UNAB Digital', L.unabDigital, 'globe'], ['Pagos y servicios', L.pagos, 'card'],
    ['Bienestar UNAB', L.bienestar, 'heartPulse'],
  ].map(([t, u, ic]) => `<a class="service" href="${u}" target="_blank" rel="noopener">${icon(ic)}<span>${t}</span></a>`).join('');

  /* ---------- Noticias ---------- */
  const news = await News.load();
  $('#newsSub').textContent = News.live ? 'En vivo desde unab.edu.co' : 'Selección de publicaciones de la UNAB';
  $('#newsPreview').innerHTML = news.slice(0, 3).map((n) => News.cardHTML(n, { compact: true })).join('');

  animateRings(); animateBars();
})();
