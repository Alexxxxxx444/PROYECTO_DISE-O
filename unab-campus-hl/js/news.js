/* ==========================================================================
   Noticias UNAB
   --------------------------------------------------------------------------
   • Con el servidor PHP activo: noticias EN VIVO de unab.edu.co (sitio
     público de la universidad) obtenidas por php/api.php?action=news, con
     caché de 15 minutos y búsqueda en el servidor.
   • Las noticias de MiPortalU (notipagprincipal.php) requieren iniciar sesión
     con usuario UNAB, por eso no pueden leerse automáticamente: se enlazan.
   • Sin servidor (o si unab.edu.co no responde): se muestra una selección
     guardada de publicaciones reales de la UNAB con su enlace original.
   ========================================================================== */

const NEWS_FALLBACK = [
  { titulo: 'Esta es la nueva forma en que debes registrar tus horas libres', imagen: 'assets/img/fotos/feria-bienestar.jpg', url: 'https://unab.edu.co/esta-es-la-nueva-forma-en-que-debes-registrar-tus-horas-libres', fecha: null, categoria: 'Bienestar',
    resumen: 'MiPortalU se renovó: los eventos de Bienestar se consultan por semana; en los presenciales se genera un código QR y en los virtuales se confirma la asistencia, y luego se responde una encuesta.' },
  { titulo: 'Jornada de donación de sangre', imagen: 'assets/img/fotos/laboratorio-salud.jpg', url: 'https://unab.edu.co/jornada-de-donacion-de-sangre-2/', fecha: '2026-02-19', categoria: 'Eventos',
    resumen: 'Higuera Escalante realizó una jornada de donación de sangre en la Sala de Atención Integral del campus El Jardín y en el Mezanine del campus El Bosque.' },
  { titulo: 'Jornada gratuita de yoga y meditación en el CSU', imagen: 'assets/img/fotos/yoga.jpg', url: 'https://unab.edu.co/jornada-gratuita-de-yoga-y-meditacion-en-el-csu/', fecha: null, categoria: 'Bienestar',
    resumen: 'Clases de yoga y meditación en el coliseo deportivo del Centro de Servicios Universitarios, coordinadas por Bienestar Universitario; válida por horas libres para estudiantes.' },
  { titulo: '¡Vuelve Cinestudio UNAB!', imagen: 'assets/img/fotos/teatro.jpg', url: 'https://unab.edu.co/vuelve-cinestudio-unab/', fecha: null, categoria: 'Cultura',
    resumen: 'El cineforo de la UNAB programa proyecciones en el Auditorio Menor Alfonso Gómez Gómez; cada función otorga dos horas libres de Bienestar Universitario.' },
  { titulo: 'Feria de la Salud: “Nuestro planeta, nuestra salud”', imagen: 'assets/img/fotos/laboratorio.jpg', url: 'https://bienestar.unab.edu.co/feria-de-la-salud-2/', fecha: null, categoria: 'Salud',
    resumen: 'Feria en el CSU organizada por Bienestar Universitario; por recorrer todos los stands se otorgan hasta 12 horas libres.' },
  { titulo: 'Taller de Innovación para el Desarrollo Territorial', imagen: 'assets/img/fotos/espacio-aprendizaje.jpg', url: 'https://bienestar.unab.edu.co/taller-de-innovacion-para-el-desarrollo-territorial/', fecha: null, categoria: 'Bienestar',
    resumen: 'Taller con 25 cupos en el Auditorio de Ingeniería del campus El Jardín, válido como horas libres para pregrado presencial.' },
  { titulo: 'Ciclo extracurricular InvestigandoAndo', imagen: 'assets/img/fotos/estudio-radio.jpg', url: 'https://unab.edu.co/wp-content/uploads/2024/09/Ciclo-extracurricular-InvestigandoAndo.pdf', fecha: null, categoria: 'Investigación',
    resumen: 'Ágoras, talleres y encuentros para fortalecer competencias investigativas; la participación de estudiantes se certifica como horas libres.' },
];

const News = {
  live: false,
  async load(q = '') {
    if (API.mode === 'php') {
      try {
        const r = await API.call('news', { q });
        if (r.live && r.items.length) { this.live = true; return r.items; }
      } catch (e) { /* se usa la selección guardada */ }
    }
    this.live = false;
    const s = q.trim().toLowerCase();
    return NEWS_FALLBACK.filter((n) => !s || `${n.titulo} ${n.resumen} ${n.categoria}`.toLowerCase().includes(s));
  },

  cardHTML(n, { compact = false } = {}) {
    const d = n.fecha ? parseISODate(n.fecha.slice(0, 10)) : null;
    return `
      <article class="news-card">
        <a class="news-media" href="${esc(n.url)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          ${n.imagen ? `<img src="${esc(n.imagen)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : `<div class="news-ph">${icon(News.catIcon(n.categoria), 'icon-lg')}</div>`}
        </a>
        <div class="news-body">
          <div class="news-meta"><span class="badge">${esc(n.categoria || 'UNAB')}</span>${d ? `<time datetime="${esc(n.fecha)}">${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}</time>` : ''}</div>
          <h3><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
          ${compact ? '' : `<p class="small muted">${esc(n.resumen || '')}</p>`}
        </div>
      </article>`;
  },

  catIcon(c) { return ({ Bienestar: 'heartPulse', Salud: 'stethoscope', Cultura: 'stage', Eventos: 'calendar', 'Investigación': 'bulb' })[c] || 'globe'; },
};
