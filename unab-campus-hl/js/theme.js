/* F08 — Se carga en <head> para aplicar el tema guardado antes de pintar
   la página (evita el parpadeo entre modo claro y oscuro). */
(function () {
  try {
    var saved = localStorage.getItem('chl_theme');
    var theme = saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
})();
