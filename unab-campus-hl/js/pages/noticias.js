/* ==========================================================================
   Página: Noticias UNAB (noticias.html) — con buscador
   ========================================================================== */
(async function () {
  await App.init({ page: 'noticias', title: 'Noticias UNAB', crumb: 'Universidad Autónoma de Bucaramanga' });
  $('#mpuNews').href = CONFIG.LINKS.noticiasMiPortalU;
  $('#unabNews').href = CONFIG.LINKS.noticiasUnab;

  let timer = null;
  const render = async (q = '') => {
    $('#newsGrid').setAttribute('aria-busy', 'true');
    const items = await News.load(q);
    $('#newsStatus').innerHTML = News.live
      ? `<div class="alert alert-success">${icon('globe', 'icon-sm')}<span><strong>En vivo:</strong> noticias públicas de unab.edu.co (se actualizan cada 15 minutos). Las de MiPortalU requieren iniciar sesión con tu usuario UNAB.</span></div>`
      : `<div class="alert">${icon('info', 'icon-sm')}<span>Mostrando una <strong>selección guardada</strong> de publicaciones reales de la UNAB. Las noticias en vivo se cargan cuando el portal corre con el servidor PHP; las de MiPortalU requieren iniciar sesión con tu usuario UNAB.</span></div>`;
    $('#nCount').textContent = `${plural(items.length, 'noticia', 'noticias')}${q ? ` para “${q}”` : ''}`;
    $('#newsGrid').innerHTML = items.length ? items.map((n) => News.cardHTML(n)).join('') : `
      <div class="card empty span-all"><div class="empty-icon">${icon('search', 'icon-lg')}</div><h3>Sin resultados</h3><p>Prueba con otra palabra.</p></div>`;
    $('#newsGrid').removeAttribute('aria-busy');
  };
  $('#nSearch').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => render(e.target.value), 350); });
  $('#nRefresh').addEventListener('click', () => render($('#nSearch').value));
  render();
})();
