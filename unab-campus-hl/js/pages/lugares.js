/* ==========================================================================
   Página: Lugares disponibles del campus (lugares.html)
   F02 búsqueda y filtros · F03 control de cupos · F06 mapa interactivo
   ========================================================================== */
(async function () {
  const initialView = getParam('vista') === 'mapa' ? 'mapa' : 'lista';
  CampusMap.calibrate = getParam('calibrar') === '1';
  await App.init({ page: initialView === 'mapa' ? 'mapa' : 'lugares', title: 'Lugares del campus', crumb: 'Horas Libres' });

  let places = [], events = [];
  const load = async () => { [places, events] = await Promise.all([API.call('places').then((r) => r.places), API.call('events').then((r) => r.events)]); };
  await load();
  const CATS = ['Todas', 'Cultura', 'Deporte', 'Salud', 'Cafetería', 'Virtual'];
  const state = { q: getParam('q') || '', cat: 'Todas', avail: '', view: initialView, selected: getParam('lugar') || null };

  /* ---------- Filtros ---------- */
  const renderChips = () => {
    $('#pCats').innerHTML = CATS.map((c) => {
      const n = c === 'Todas' ? places.length : places.filter((p) => p.categoria === c).length;
      return `<button type="button" class="chip" data-cat="${c}" aria-pressed="${state.cat === c}">${c !== 'Todas' ? icon(categoriaIcon(c), 'icon-sm') : ''}${c}<span class="count">${n}</span></button>`;
    }).join('');
    $$('#pCats .chip').forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; renderChips(); render(); }));
  };

  const filtered = () => {
    const q = state.q.trim().toLowerCase();
    return places.filter((p) =>
      (state.cat === 'Todas' || p.categoria === state.cat) &&
      (!state.avail || (state.avail === 'con' ? p.cuposDisponibles > 0 : p.cuposDisponibles <= 0)) &&
      (!q || `${p.nombre} ${p.descripcion} ${p.categoria} ${p.proximas.map((e) => e.titulo).join(' ')}`.toLowerCase().includes(q)));
  };

  /* ---------- Vista de tarjetas ---------- */
  const render = () => {
    const list = filtered();
    $('#pCount').textContent = `${plural(list.length, 'lugar encontrado', 'lugares encontrados')}`;
    if (state.view === 'lista') {
      $('#listView').innerHTML = list.map((p) => PlacesUI.cardHTML(p)).join('');
      $('#placesEmpty').classList.toggle('hidden', list.length > 0);
      $('#placesEmpty').innerHTML = `<div class="empty-icon">${icon('search', 'icon-lg')}</div><h3>No hay lugares que coincidan</h3><p>Prueba con otro nombre o quita algún filtro.</p><button class="btn btn-outline btn-sm" type="button" id="resetF">Limpiar filtros</button>`;
      $('#resetF')?.addEventListener('click', resetFilters);
      animateBars($('#listView'));
    } else {
      renderMap(list);
    }
  };

  const resetFilters = () => {
    state.q = ''; state.cat = 'Todas'; state.avail = '';
    $('#pSearch').value = ''; $('#pAvail').value = '';
    renderChips(); render();
  };

  /* ---------- Vista de mapa (F06) ---------- */
  const panelHTML = (p) => {
    if (!p) return `<div class="empty compact"><div class="empty-icon">${icon('compass', 'icon-lg')}</div><h3>Selecciona un punto</h3><p class="small">Haz clic o usa el teclado sobre un marcador para ver el lugar y sus próximas actividades.</p></div>`;
    const st = PlacesUI.cuposState(p);
    const next = events.filter((e) => e.placeId === p.id && Rules.isUpcoming(e)).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)).slice(0, 3);
    return `
      <img class="panel-img" src="${esc(p.imagen)}" alt="Foto de referencia (UNAB) para ${esc(p.nombre)}">
      <div class="row" style="margin:14px 0 6px"><span class="badge badge-dark">${esc(p.categoria)}</span><span class="badge ${st.cls}">${esc(st.text)}</span></div>
      <h2 class="card-title-sm" style="font-size:1.2rem">${esc(p.nombre)}</h2>
      <p class="small muted">${esc(p.descripcion)}</p>
      <p class="small">${icon('pin', 'icon-sm')} ${esc(p.ubicacion)}</p>
      <h3 class="xsmall muted" style="text-transform:uppercase;letter-spacing:.08em;margin-top:12px">Próximas actividades</h3>
      <div class="event-list">${next.length ? next.map((e) => EventsUI.rowHTML(e, { compact: true })).join('') : '<p class="small muted">Sin actividades programadas.</p>'}</div>
      <div class="place-actions"><button class="btn btn-outline" type="button" data-action="detail" data-id="${esc(p.id)}">Ver todas</button>
      <a class="btn btn-primary" href="cronograma.html">Agenda completa</a></div>`;
  };

  const renderMap = (list) => {
    if (state.selected && !list.some((p) => p.id === state.selected)) state.selected = null;
    CampusMap.render($('#mapCanvas'), list, {
      selected: state.selected,
      onSelect: (id) => { state.selected = id; $('#mapPanel').innerHTML = panelHTML(places.find((p) => p.id === id)); },
    });
    $('#mapPanel').innerHTML = panelHTML(places.find((p) => p.id === state.selected));
    if (GMaps.current !== CampusMap.current) { GMaps.current = CampusMap.current; GMaps.render($('#gmaps')); }
    const fuera = CampusMap.outside(list);
    $('#mapLegend').innerHTML = `
      <span><i class="lg-dot ok"></i> Con cupos</span><span><i class="lg-dot low"></i> Pocos cupos</span><span><i class="lg-dot full"></i> Sin cupos</span>
      ${fuera.length ? `<span class="muted">Sin plano (virtual u otra sede): ${fuera.map((p) => `<button type="button" class="link-btn" data-action="detail" data-id="${esc(p.id)}">${esc(p.nombre)}</button>`).join(', ')}</span>` : ''}`;
  };

  const setView = (v) => {
    state.view = v;
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    $('#listView').classList.toggle('hidden', v !== 'lista');
    $('#mapView').classList.toggle('hidden', v !== 'mapa');
    if (v !== 'lista') $('#placesEmpty').classList.add('hidden');
    const url = new URL(location.href);
    if (v === 'mapa') url.searchParams.set('vista', 'mapa'); else { url.searchParams.delete('vista'); url.searchParams.delete('calibrar'); }
    history.replaceState(null, '', url);
    $$('.nav a').forEach((a) => a.removeAttribute('aria-current'));
    $(`.nav a[href="${v === 'mapa' ? 'lugares.html?vista=mapa' : 'lugares.html'}"]`)?.setAttribute('aria-current', 'page');
    render();
  };

  document.addEventListener('campusmap:official', (e) => {
    $('#mapBadge').textContent = e.detail ? 'Plano oficial' : 'Plano ilustrativo · agrega la imagen oficial del campus';
    $('#mapBadge').className = e.detail ? 'badge' : 'badge badge-demo';
  });
  if (CampusMap.calibrate) Toast.show('Modo calibración: haz clic en el plano para obtener las coordenadas de un marcador.', 'info', 7000);

  /* ---------- Acciones (delegadas) ---------- */
  const refresh = async () => { await load(); renderChips(); render(); };
  EventsUI.bind($('#mapPanel'), () => events, refresh);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const p = places.find((x) => x.id === btn.dataset.id);
    if (!p) return;
    if (btn.dataset.action === 'detail') PlacesUI.detail(p, events, { onDone: refresh });
    if (btn.dataset.action === 'enroll') PlacesUI.enroll(p, events, { onDone: refresh });
  });

  $('#pSearch').value = state.q;
  $('#pSearch').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  $('#pAvail').addEventListener('change', (e) => { state.avail = e.target.value; render(); });
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  renderChips();
  setView(state.view);
  GMaps.render($('#gmaps'));
  if (location.hash === '#gmaps') $('#gmaps').scrollIntoView();
})();
