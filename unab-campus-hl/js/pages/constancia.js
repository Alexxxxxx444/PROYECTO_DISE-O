/* ==========================================================================
   Página: Constancia de Horas Libres imprimible (constancia.html) — F10
   Se imprime o guarda como PDF con el diálogo nativo del navegador.
   ========================================================================== */
(async function () {
  const user = await App.init({ page: 'constancia', title: 'Constancia de HL', crumb: 'Organización' });
  const s = App.summary;
  const { history } = await API.call('history');
  const rows = [...history].sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
  const emitida = new Date();
  const codigoVerif = sha256(`${user.codigo}|${s.cumplidas}|${rows.length}|${toISODate(emitida)}`).slice(0, 12).toUpperCase().replace(/(.{4})/g, '$1-').slice(0, 14);

  $('#certificate').innerHTML = `
    <header class="cert-head">
      <div class="row" style="gap:14px">
        <img src="assets/img/unab/isotipo-azul.png" alt="" width="44" height="49">
        <div><div class="cert-eyebrow">Universidad Autónoma de Bucaramanga · Bienestar Universitario</div><strong class="cert-brand">UNAB Campus HL</strong></div>
      </div>
      <div class="cert-meta">
        <div><span>Fecha de emisión</span><strong>${formatDate(toISODate(emitida))}</strong></div>
        <div><span>Código de verificación</span><strong>${codigoVerif}</strong></div>
      </div>
    </header>

    <div class="cert-title">
      <h1>Constancia de Horas Libres</h1>
      <p>Resumen de las actividades libres (Horas Libres) registradas en la plataforma a la fecha de emisión. Horas libres requeridas: ${s.requeridas}.</p>
    </div>

    <section class="cert-section">
      <h2>Datos del estudiante</h2>
      <dl class="cert-data">
        <div><dt>Nombre completo</dt><dd>${esc(user.nombre)}</dd></div>
        <div><dt>Código estudiantil</dt><dd>${esc(user.codigo)}</dd></div>
        <div><dt>Correo institucional</dt><dd>${esc(user.correo)}</dd></div>
        <div><dt>Programa académico</dt><dd>${esc(user.programa || 'Sin especificar')}${user.semestre ? ` · ${user.semestre}.º semestre` : ''}</dd></div>
      </dl>
    </section>

    <section class="cert-section">
      <h2>Resumen</h2>
      <div class="cert-boxes">
        <div><span>Requeridas</span><strong>${s.requeridas} h</strong></div>
        <div class="ok"><span>Cumplidas</span><strong>${s.cumplidas} h</strong></div>
        <div class="pend"><span>Pendientes</span><strong>${s.pendientes} h</strong></div>
        <div><span>Cumplimiento</span><strong>${s.porcentaje}%</strong></div>
      </div>
      <div class="progress progress-lg cert-progress"><div class="progress-bar" style="width:${s.porcentaje}%"></div></div>
      <p class="cert-status">${s.pendientes === 0
        ? `${icon('checkCircle', 'icon-sm')} El estudiante <strong>completó</strong> las Horas Libres requeridas.`
        : `${icon('clock', 'icon-sm')} El estudiante tiene <strong>${plural(s.pendientes, 'hora libre pendiente', 'horas libres pendientes')}</strong>.`}</p>
    </section>

    <section class="cert-section">
      <h2>Historial de Horas Libres</h2>
      ${rows.length ? `
      <table class="cert-table">
        <thead><tr><th>#</th><th>Fecha</th><th>Actividad</th><th>Lugar</th><th class="text-right">Horas</th></tr></thead>
        <tbody>${rows.map((h, i) => `<tr><td>${i + 1}</td><td>${formatDate(h.fecha)}</td><td>${esc(h.titulo)}<br><span class="cert-cat">${esc(h.categoria || '')}</span></td><td>${esc(h.lugar || '')}</td><td class="text-right">${h.horas}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4">Total de Horas Libres cumplidas</td><td class="text-right">${s.cumplidas}</td></tr></tfoot>
      </table>` : '<p class="muted">No hay actividades registradas.</p>'}
    </section>

    <footer class="cert-foot">
      <p><strong>Nota:</strong> documento informativo generado por UNAB Campus HL (proyecto académico). No reemplaza las certificaciones oficiales de la Universidad Autónoma de Bucaramanga.
      ${API.mode === 'local' ? 'Datos almacenados localmente en el navegador (modo demostración).' : ''}</p>
      <p class="cert-sign">Generado el ${formatLongToday()} a las ${formatHour(`${String(emitida.getHours()).padStart(2, '0')}:${String(emitida.getMinutes()).padStart(2, '0')}`)}</p>
    </footer>`;

  $('#printBtn').addEventListener('click', () => window.print());
  if (getParam('imprimir')) setTimeout(() => window.print(), 400);
})();
