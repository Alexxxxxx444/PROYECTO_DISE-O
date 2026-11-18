/* ==========================================================================
   Página: Agenda / cronograma de actividades de Bienestar (cronograma.html)
   Semana a semana, con búsqueda, filtros y calendario mensual.
   ========================================================================== */
(async function () {
  await App.init({ page: 'agenda', title: 'Agenda de actividades', crumb: 'Bienestar Universitario · Horas libres' });

  let events = [];
  const CATS = ['Todas', 'Cultura', 'Deporte', 'Salud', 'Desarrollo humano'];
  const state = { q: getParam('q') || '', cat: 'Todas', mod: '', cupos: false, week: 0, month: null };
  const load = async () => { events = (await API.call('events')).events; };
  await load();

  const mon0 = weekMonday();
  const weekStart = () => addDays(mon0, state.week * 7);
  $('#howLink').href = CONFIG.LINKS.registroHL;

  // Semana inicial: la de una fecha concreta (?fecha=AAAA-MM-DD)
  if (getParam('fecha')) state.week = Math.floor((parseISODate(getParam('fecha')) - mon0) / (7 * 864e5));

  const filtered = () => {
    const q = state.q.trim().toLowerCase();
    return events.filter((e) =>
      (state.cat === 'Todas' || e.categoria === state.cat) &&
      (!state.mod || e.modalidad === state.mod) &&
      (!state.cupos || (e.cuposDisponibles > 0 && Rules.isUpcoming(e))) &&
      (!q || `${e.titulo} ${e.lugar} ${e.categoria} ${e.modalidad}`.toLowerCase().includes(q)));
  };

  const renderChips = () => {
    $('#aCats').innerHTML = CATS.map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="${state.cat === c}">${c !== 'Todas' ? icon(categoriaIcon(c), 'icon-sm') : ''}${c}<span class="count">${c === 'Todas' ? events.length : events.filter((e) => e.categoria === c).length}</span></button>`).join('');
  };

  const renderWeek = () => {
    const ws = weekStart(); const we = addDays(ws, 6);
    const list = filtered();
    const inWeek = list.filter((e) => e.fecha >= toISODate(ws) && e.fecha <= toISODate(we));
    $('#wkLabel').textContent = `${ws.getDate()} ${MESES_CORTOS[ws.getMonth()]} – ${we.getDate()} ${MESES_CORTOS[we.getMonth()]} ${we.getFullYear()}`;
    $('#wkSub').textContent = state.week === 0 ? 'Esta semana' : state.week === 1 ? 'Próxima semana' : state.week === -1 ? 'Semana pasada' : '';
    const hl = inWeek.reduce((a, e) => a + e.horas, 0);
    $('#aCount').textContent = `${plural(list.length, 'actividad', 'actividades')} · ${plural(inWeek.length, 'esta semana', 'esta semana')} (${hl} HL posibles)`;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i); const iso = toISODate(d);
      const items = inWeek.filter((e) => e.fecha === iso).sort((a, b) => a.inicio.localeCompare(b.inicio));
      if (!items.length) continue;
      days.push(`
        <div class="agenda-day ${iso === todayISO() ? 'is-today' : ''}" id="dia-${iso}">
          <div class="agenda-day-head">
            <div class="date-chip"><small>${DIAS_CORTOS[d.getDay()]}</small><b>${d.getDate()}</b></div>
            <div><strong>${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}</strong>${iso === todayISO() ? ' <span class="badge badge-dark">Hoy</span>' : ''}
            <div class="xsmall muted">${plural(items.length, 'actividad', 'actividades')} · hasta ${items.reduce((a, e) => a + e.horas, 0)} HL</div></div>
          </div>
          <div class="event-list">${items.map((e) => EventsUI.rowHTML(e)).join('')}</div>
        </div>`);
    }
    $('#agendaDays').innerHTML = days.join('') || `
      <div class="empty"><div class="empty-icon">${icon('calendar', 'icon-lg')}</div><h3>Sin actividades esta semana</h3>
      <p>Cambia de semana o ajusta los filtros.</p></div>`;
    $('#wkPrev').disabled = !events.some((e) => e.fecha < toISODate(ws));
    $('#wkNext').disabled = !events.some((e) => e.fecha > toISODate(we));
  };

  /* ---------- Calendario mensual ---------- */
  const renderCal = () => {
    const base = state.month || new Date(weekStart().getFullYear(), weekStart().getMonth(), 1);
    const y = base.getFullYear(), m = base.getMonth();
    $('#calTitle').textContent = `${MESES[m][0].toUpperCase()}${MESES[m].slice(1)} ${y}`;
    const first = new Date(y, m, 1); const offset = (first.getDay() + 6) % 7;
    const daysIn = new Date(y, m + 1, 0).getDate();
    const list = filtered();
    let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span class="mc-h">${d}</span>`).join('');
    for (let i = 0; i < offset; i++) cells += '<span></span>';
    for (let d = 1; d <= daysIn; d++) {
      const iso = toISODate(new Date(y, m, d));
      const n = list.filter((e) => e.fecha === iso).length;
      const mine = list.some((e) => e.fecha === iso && e.miEstado);
      cells += `<button type="button" class="mc-d ${iso === todayISO() ? 'today' : ''} ${n ? 'has' : ''} ${mine ? 'mine' : ''}" data-day="${iso}" ${n ? '' : 'disabled'} aria-label="${d} de ${MESES[m]}: ${plural(n, 'actividad', 'actividades')}">${d}${n ? '<i></i>' : ''}</button>`;
    }
    $('#miniCal').innerHTML = `<div class="mc-nav"><button type="button" class="icon-btn sm" data-mc="-1" aria-label="Mes anterior">${icon('chevronRight', 'icon-sm flip')}</button><button type="button" class="icon-btn sm" data-mc="1" aria-label="Mes siguiente">${icon('chevronRight', 'icon-sm')}</button></div><div class="mc-grid">${cells}</div><div class="mc-legend"><span><i></i>Con actividades</span><span><i class="mine"></i>Inscrito</span></div>`;
  };

  const renderAll = () => { renderChips(); renderWeek(); renderCal(); };

  /* ---------- Eventos ---------- */
  $('#aSearch').value = state.q;
  $('#aSearch').addEventListener('input', (e) => { state.q = e.target.value; renderWeek(); renderCal(); });
  $('#aMod').addEventListener('change', (e) => { state.mod = e.target.value; renderWeek(); renderCal(); });
  $('#aCupos').addEventListener('change', (e) => { state.cupos = e.target.checked; renderWeek(); renderCal(); });
  $('#aCats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; state.cat = b.dataset.cat; renderAll(); });
  $('#wkPrev').addEventListener('click', () => { state.week--; state.month = null; renderWeek(); renderCal(); });
  $('#wkNext').addEventListener('click', () => { state.week++; state.month = null; renderWeek(); renderCal(); });
  $('#wkToday').addEventListener('click', () => { state.week = 0; state.month = null; renderWeek(); renderCal(); });
  $('#miniCal').addEventListener('click', (e) => {
    const nav = e.target.closest('[data-mc]');
    if (nav) { const b = state.month || new Date(weekStart().getFullYear(), weekStart().getMonth(), 1); state.month = new Date(b.getFullYear(), b.getMonth() + Number(nav.dataset.mc), 1); renderCal(); return; }
    const day = e.target.closest('[data-day]');
    if (!day) return;
    state.week = Math.floor((parseISODate(day.dataset.day) - mon0) / (7 * 864e5));
    renderWeek();
    $(`#dia-${day.dataset.day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  EventsUI.bind($('#agendaDays'), () => events, async () => { await load(); renderAll(); });

  renderAll();
})();
