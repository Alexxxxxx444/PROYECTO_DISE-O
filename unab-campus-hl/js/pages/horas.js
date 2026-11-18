/* ==========================================================================
   Página: Gestión de Horas Libres (horas-libres.html)
   F01 barra de progreso · F05 historial con búsqueda, filtros y orden
   ========================================================================== */
(async function () {
  await App.init({ page: 'horas', title: 'Mis Horas Libres', crumb: 'Horas Libres' });
  const s = App.summary;
  const { history } = await API.call('history');

  /* ---------- Resumen ---------- */
  $('#reqBadge').innerHTML = s.requeridasDemo ? '<span class="badge badge-demo">Meta de demostración</span>'
    : '<span class="badge badge-neutral">Requisito de grado</span>';
  const items = [
    ['Requeridas', s.requeridas, 'award', 'dark'],
    ['Cumplidas', s.cumplidas, 'checkCircle', 'success'],
    ['Pendientes', s.pendientes, 'hourglass', 'warning'],
    ['Cumplimiento', `${s.porcentaje}%`, 'trending', ''],
  ];
  $('#hlSummary').innerHTML = items.map(([l, v, ic, c]) => `
    <div class="hl-stat"><div class="kpi-icon ${c}">${icon(ic)}</div><div><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div></div></div>`).join('');

  const bar = $('#bigBar');
  bar.setAttribute('aria-valuenow', s.porcentaje);
  bar.classList.toggle('complete', s.porcentaje >= 100);
  $('.progress-bar', bar).dataset.width = `${s.porcentaje}%`;
  $('#pctLabel').textContent = `${s.porcentaje}% completado`;
  $('#leftLabel').textContent = s.pendientes ? `Faltan ${plural(s.pendientes, 'hora', 'horas')}` : 'Meta cumplida';

  /* ---------- Ritmo ---------- */
  const now = new Date();
  const thisMonth = history.filter((h) => { const d = parseISODate(h.fecha); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const last30 = history.filter((h) => parseISODate(h.fecha) >= addDays(now, -30)).reduce((a, h) => a + Number(h.horas), 0);
  const avg = history.length ? (s.cumplidas / history.length) : 0;
  const weeksToGo = last30 > 0 && s.pendientes > 0 ? Math.ceil(s.pendientes / (last30 / 4.3)) : null;
  const top = [...s.porCategoria].sort((a, b) => b.horas - a.horas)[0];
  $('#pace').innerHTML = `
    <li><span>${icon('calendar', 'icon-sm')} Horas este mes</span><strong>${thisMonth.reduce((a, h) => a + Number(h.horas), 0)} h</strong></li>
    <li><span>${icon('listCheck', 'icon-sm')} Actividades realizadas</span><strong>${history.length}</strong></li>
    <li><span>${icon('clock', 'icon-sm')} Promedio por actividad</span><strong>${avg.toFixed(1).replace('.', ',')} h</strong></li>
    <li><span>${icon('stage', 'icon-sm')} Tipo de actividad más frecuente</span><strong>${top && top.horas ? esc(top.categoria) : '—'}</strong></li>
    <li><span>${icon('trending', 'icon-sm')} Al ritmo actual terminas en</span><strong>${s.pendientes === 0 ? '¡Completado!' : weeksToGo ? `≈ ${plural(weeksToGo, 'semana', 'semanas')}` : 'Sin datos recientes'}</strong></li>`;

  /* ---------- Historial (F05) ---------- */
  const placeNames = [...new Set(history.map((h) => h.categoria).filter(Boolean))].sort();
  $('#hPlace').insertAdjacentHTML('beforeend', placeNames.map((n) => `<option>${esc(n)}</option>`).join(''));
  const state = { q: '', place: '', period: '', sort: 'fecha', dir: -1 };

  const render = () => {
    const q = state.q.trim().toLowerCase();
    let rows = history.filter((h) =>
      (!state.place || h.categoria === state.place) &&
      (!state.period || parseISODate(h.fecha) >= addDays(now, -Number(state.period))) &&
      (!q || `${h.titulo} ${h.lugar} ${h.categoria} ${formatDate(h.fecha, { weekday: true })} ${h.fecha}`.toLowerCase().includes(q)));
    rows.sort((a, b) => {
      const va = state.sort === 'horas' ? Number(a.horas) : state.sort === 'lugar' ? a.titulo : a.fecha + a.inicio;
      const vb = state.sort === 'horas' ? Number(b.horas) : state.sort === 'lugar' ? b.titulo : b.fecha + b.inicio;
      return (va > vb ? 1 : va < vb ? -1 : 0) * state.dir;
    });
    $('#histTable tbody').innerHTML = rows.map((h) => `
      <tr>
        <td class="nowrap"><strong>${formatDate(h.fecha, { short: true })}</strong> <span class="muted xsmall">${parseISODate(h.fecha).getFullYear()}</span></td>
        <td><span class="row" style="gap:10px;flex-wrap:nowrap"><span class="cat-dot">${icon(categoriaIcon(h.categoria), 'icon-sm')}</span><span><strong>${esc(h.titulo)}</strong><br><span class="xsmall muted">${esc(h.lugar || '')}</span></span></span></td>
        <td class="nowrap">${esc(h.categoria || '')}</td>
        <td class="nowrap muted">${formatRange(h.inicio, h.fin)}</td>
        <td class="text-right"><span class="badge badge-success">+${h.horas} h</span></td>
      </tr>`).join('');
    $('#histTotal').textContent = `${rows.reduce((a, h) => a + Number(h.horas), 0)} h`;
    $('#histCount').textContent = `${plural(rows.length, 'registro', 'registros')} de ${history.length}`;
    $('#histTable').closest('.table-wrap').classList.toggle('hidden', rows.length === 0);
    const empty = $('#histEmpty');
    empty.classList.toggle('hidden', rows.length > 0);
    empty.innerHTML = history.length
      ? `<div class="empty-icon">${icon('search', 'icon-lg')}</div><h3>Sin resultados</h3><p>Ningún registro coincide con los filtros.</p><button class="btn btn-outline btn-sm" type="button" id="clearF">Limpiar filtros</button>`
      : `<div class="empty-icon">${icon('history', 'icon-lg')}</div><h3>Aún no tienes Horas Libres registradas</h3><p>Inscríbete en una actividad, registra tu asistencia y responde la encuesta para verlas aquí.</p><a class="btn btn-primary btn-sm" href="cronograma.html">Ver agenda</a>`;
    $('#clearF')?.addEventListener('click', () => { state.q = state.place = state.period = ''; $('#hSearch').value = ''; $('#hPlace').value = ''; $('#hPeriod').value = ''; render(); });
    $$('[data-sort]').forEach((b) => {
      const active = b.dataset.sort === state.sort;
      b.closest('th').setAttribute('aria-sort', active ? (state.dir === 1 ? 'ascending' : 'descending') : 'none');
      $('.sort-ind', b).textContent = active ? (state.dir === 1 ? '▲' : '▼') : '';
    });
  };

  $('#hSearch').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('#hPlace').addEventListener('change', (e) => { state.place = e.target.value; render(); });
  $('#hPeriod').addEventListener('change', (e) => { state.period = e.target.value; render(); });
  $$('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    if (state.sort === b.dataset.sort) state.dir *= -1; else { state.sort = b.dataset.sort; state.dir = b.dataset.sort === 'lugar' ? 1 : -1; }
    render();
  }));

  render();
  animateBars();
})();
