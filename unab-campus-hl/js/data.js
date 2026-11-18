/* ==========================================================================
   DATOS: lugares y agenda de actividades de Bienestar Universitario
   --------------------------------------------------------------------------
   • Lugares del proyecto: Banú, Gimnasio, Cafetería Casona, Cafetería Bosque
     y Cafetería CSU (documento de inscripción del proyecto).
   • Escenarios reales de Bienestar UNAB donde se han realizado actividades
     de Horas Libres: Auditorio Mayor y Auditorio Menor (Campus El Jardín),
     coliseo del CSU, Sala de Atención Integral y el aula virtual.
   • Actividades: cada una con "fuente" (URL de la UNAB donde se publicó una
     actividad igual o equivalente y sus horas) o marcada demo: true cuando
     es un ejemplo sin publicación encontrada (p. ej. origami o rumba).
   • Las FECHAS se generan relativas a la semana actual para que la agenda
     siempre tenga actividades próximas. Cupos y ubicación en el plano: demo.

   Mapa (F06): "campus" = plano donde aparece ('jardin' | 'csu' | null) y
   "mapa: {x, y}" = posición en % del plano. Calibrar con
   lugares.html?vista=mapa&calibrar=1.
   ========================================================================== */

const FUENTES = {
  actividades: 'https://bienestar.unab.edu.co/actividades-horas-libres-bienestar-universitario/',
  cinestudio: 'https://unab.edu.co/vuelve-cinestudio-unab/',
  teatro: 'https://bienestar.unab.edu.co/teatro-2/',
  cuenteria: 'https://bienestar.unab.edu.co/cuenteria-2/',
  diaBienestar: 'https://bienestar.unab.edu.co/dia-de-bienestar/',
  diasBienestar: 'https://bienestar.unab.edu.co/dias-de-bienestar/',
  estarEnForma: 'https://bienestar.unab.edu.co/evento-bienu/charla-programa-estar-en-forma-2/',
  deportes2021: 'https://bienestar.unab.edu.co/2021/',
  feriaSalud: 'https://bienestar.unab.edu.co/feria-de-la-salud-2/',
  yoga: 'https://unab.edu.co/jornada-gratuita-de-yoga-y-meditacion-en-el-csu/',
  donacion: 'https://unab.edu.co/jornada-de-donacion-de-sangre-2/',
  investigandoAndo: 'https://unab.edu.co/wp-content/uploads/2024/09/Ciclo-extracurricular-InvestigandoAndo.pdf',
  comeBien: 'https://bienestar.unab.edu.co/covid19/',
};

/* ---------- Lugares / escenarios ---------- */
const DEMO_PLACES = [
  { id: 'banu', nombre: 'Banú', categoria: 'Cultura', campus: 'jardin', mapa: { x: 30, y: 34 },
    descripcion: 'Espacio de bienestar y cultura del campus donde se realizan talleres creativos y encuentros de la comunidad estudiantil.',
    ubicacion: 'Campus El Jardín (ubicación de referencia)', imagen: 'assets/img/fotos/musica.jpg' },
  { id: 'gimnasio', nombre: 'Gimnasio', categoria: 'Deporte', campus: 'csu', mapa: { x: 34, y: 38 },
    descripcion: 'Gimnasio para clases grupales y entrenamiento dirigido por Bienestar Universitario.',
    ubicacion: 'CSU (ubicación de referencia)', imagen: 'assets/img/fotos/deporte-padel.jpg' },
  { id: 'casona', nombre: 'Cafetería Casona', categoria: 'Cafetería', campus: 'jardin', mapa: { x: 20, y: 70 },
    descripcion: 'Cafetería con espacio para stands y charlas cortas de Días de Bienestar sobre hábitos saludables.',
    ubicacion: 'Casona (ubicación de referencia)', imagen: 'assets/img/fotos/espacio-aprendizaje.jpg' },
  { id: 'bosque', nombre: 'Cafetería Bosque', categoria: 'Cafetería', campus: 'jardin', mapa: { x: 56, y: 80 },
    descripcion: 'Cafetería con zona de encuentro para actividades breves de salud mental y conversatorios.',
    ubicacion: 'Por confirmar (ubicación de referencia)', imagen: 'assets/img/fotos/comunidad.jpg' },
  { id: 'csu', nombre: 'Cafetería CSU', categoria: 'Cafetería', campus: 'csu', mapa: { x: 66, y: 62 },
    descripcion: 'Cafetería del Centro de Servicios Universitarios con actividades de pausa activa y alimentación saludable.',
    ubicacion: 'CSU, Cra. 47 N.° 53-78, barrio Terrazas', imagen: 'assets/img/fotos/feria-bienestar.jpg' },
  { id: 'auditorio-mayor', nombre: 'Auditorio Mayor', categoria: 'Cultura', campus: 'jardin', mapa: { x: 70, y: 25 },
    descripcion: 'Auditorio principal del campus El Jardín, sede de obras de teatro y eventos culturales de Bienestar.',
    ubicacion: 'Campus El Jardín, Av. 42 N.° 48-11', imagen: 'assets/img/fotos/teatro.jpg' },
  { id: 'auditorio-menor', nombre: 'Auditorio Menor Alfonso Gómez Gómez', categoria: 'Cultura', campus: 'jardin', mapa: { x: 46, y: 50 },
    descripcion: 'Auditorio donde se proyecta Cinestudio, el cineforo de la UNAB.',
    ubicacion: 'Campus El Jardín, Av. 42 N.° 48-11', imagen: 'assets/img/fotos/danza.jpg' },
  { id: 'coliseo-csu', nombre: 'Coliseo deportivo CSU', categoria: 'Deporte', campus: 'csu', mapa: { x: 60, y: 30 },
    descripcion: 'Coliseo del Centro de Servicios Universitarios: circuitos funcionales, yoga y la Feria de la Salud.',
    ubicacion: 'CSU, Cra. 47 N.° 53-78, barrio Terrazas', imagen: 'assets/img/fotos/porras.jpg' },
  { id: 'sala-atencion', nombre: 'Sala de Atención Integral', categoria: 'Salud', campus: 'jardin', mapa: { x: 84, y: 60 },
    descripcion: 'Punto de atención en salud del campus El Jardín, sede de jornadas como la donación de sangre.',
    ubicacion: 'Campus El Jardín, Av. 42 N.° 48-11', imagen: 'assets/img/fotos/laboratorio-salud.jpg' },
  { id: 'virtual', nombre: 'Aula virtual', categoria: 'Virtual', campus: null, mapa: null,
    descripcion: 'Actividades por Google Meet, Zoom o Twitch. La asistencia se registra con “Confirmar asistencia”.',
    ubicacion: 'En línea', imagen: 'assets/img/fotos/estudio-radio.jpg' },
];

/**
 * Agenda de actividades. d = día relativo al lunes de la semana actual
 * (0 = lunes, 2 = miércoles, 7 = lunes siguiente…).
 */
const AGENDA = [
  // ---- Semana actual ----
  { id: 'a01', d: 0, inicio: '10:00', fin: '11:00', titulo: 'Charla “Estrés y ansiedad” · Programa Estar en Forma', categoria: 'Salud', modalidad: 'virtual', placeId: 'virtual', horas: 2, cupos: 120, ocupados: 64, fuente: FUENTES.estarEnForma },
  { id: 'a02', d: 1, inicio: '18:00', fin: '20:00', titulo: 'Body Combat', categoria: 'Deporte', modalidad: 'virtual', placeId: 'virtual', horas: 2, cupos: 80, ocupados: 31, fuente: FUENTES.deportes2021 },
  { id: 'a03', d: 3, inicio: '08:00', fin: '12:00', titulo: 'Jornada de recreación deportiva', categoria: 'Deporte', modalidad: 'presencial', placeId: 'coliseo-csu', horas: 4, cupos: 60, ocupados: 22, demo: true },
  { id: 'a04', d: 2, inicio: '10:00', fin: '11:00', titulo: 'Herramientas de afrontamiento emocional: “Memoria de emociones”', categoria: 'Salud', modalidad: 'presencial', placeId: 'casona', horas: 1, cupos: 25, ocupados: 18, fuente: FUENTES.diasBienestar },
  { id: 'a05', d: 2, inicio: '14:00', fin: '16:00', titulo: 'Taller de origami', categoria: 'Cultura', modalidad: 'presencial', placeId: 'banu', horas: 2, cupos: 20, ocupados: 12, demo: true },
  { id: 'a06', d: 2, inicio: '18:00', fin: '20:00', titulo: 'Cine Club Cuarto Oscuro', categoria: 'Cultura', modalidad: 'virtual', placeId: 'virtual', horas: 3, cupos: 150, ocupados: 40, fuente: FUENTES.actividades },
  { id: 'a07', d: 3, inicio: '09:00', fin: '11:00', titulo: 'Circuito funcional Full Body', categoria: 'Deporte', modalidad: 'presencial', placeId: 'gimnasio', horas: 3, cupos: 30, ocupados: 21, fuente: FUENTES.deportes2021 },
  { id: 'a08', d: 3, inicio: '18:30', fin: '20:30', titulo: 'Cinestudio UNAB · cineforo', categoria: 'Cultura', modalidad: 'presencial', placeId: 'auditorio-menor', horas: 2, cupos: 90, ocupados: 55, fuente: FUENTES.cinestudio },
  { id: 'a09', d: 4, inicio: '08:00', fin: '18:00', titulo: 'Jornada de donación de sangre (Higuera Escalante)', categoria: 'Salud', modalidad: 'presencial', placeId: 'sala-atencion', horas: 2, cupos: 60, ocupados: 34, fuente: FUENTES.donacion, notaHoras: 'Horas libres: valor demo (la publicación no indica la cantidad).' },
  { id: 'a10', d: 4, inicio: '18:00', fin: '20:00', titulo: 'Cuentería en línea', categoria: 'Cultura', modalidad: 'virtual', placeId: 'virtual', horas: 3, cupos: 100, ocupados: 37, fuente: FUENTES.cuenteria },
  { id: 'a11', d: 5, inicio: '07:00', fin: '12:00', titulo: 'Jornada de yoga y meditación', categoria: 'Deporte', modalidad: 'presencial', placeId: 'coliseo-csu', horas: 4, cupos: 80, ocupados: 46, fuente: FUENTES.yoga, notaHoras: 'Válida por horas libres; cantidad de horas: valor demo.' },
  // ---- Semana 2 ----
  { id: 'a12', d: 7, inicio: '10:00', fin: '11:00', titulo: 'Día de Bienestar: derechos sexuales y reproductivos', categoria: 'Salud', modalidad: 'virtual', placeId: 'virtual', horas: 2, cupos: 120, ocupados: 30, fuente: FUENTES.diaBienestar },
  { id: 'a13', d: 7, inicio: '12:00', fin: '13:00', titulo: 'Rumba aeróbica', categoria: 'Deporte', modalidad: 'presencial', placeId: 'gimnasio', horas: 1, cupos: 35, ocupados: 20, demo: true },
  { id: 'a14', d: 8, inicio: '10:00', fin: '12:00', titulo: 'Circuito funcional Cardio HIIT', categoria: 'Deporte', modalidad: 'presencial', placeId: 'coliseo-csu', horas: 3, cupos: 40, ocupados: 33, fuente: FUENTES.deportes2021 },
  { id: 'a15', d: 8, inicio: '15:00', fin: '16:00', titulo: 'Días de Bienestar: “Mi red”', categoria: 'Salud', modalidad: 'presencial', placeId: 'bosque', horas: 2, cupos: 20, ocupados: 20, fuente: FUENTES.feriaSalud },
  { id: 'a16', d: 9, inicio: '14:00', fin: '16:00', titulo: 'Taller de arteterapia', categoria: 'Cultura', modalidad: 'presencial', placeId: 'banu', horas: 2, cupos: 18, ocupados: 9, demo: true },
  { id: 'a17', d: 9, inicio: '11:00', fin: '12:00', titulo: 'Taller “Come Bien”: alimentación saludable', categoria: 'Salud', modalidad: 'presencial', placeId: 'csu', horas: 2, cupos: 25, ocupados: 11, fuente: FUENTES.comeBien, notaHoras: 'La app Come Bien otorga horas libres; el taller presencial es un ejemplo.' },
  { id: 'a18', d: 10, inicio: '08:00', fin: '13:00', titulo: 'Feria de la Salud', categoria: 'Salud', modalidad: 'presencial', placeId: 'coliseo-csu', horas: 12, cupos: 300, ocupados: 140, fuente: FUENTES.feriaSalud, notaHoras: 'Hasta 12 horas libres por recorrer todos los stands.' },
  { id: 'a19', d: 10, inicio: '15:30', fin: '16:30', titulo: 'Herramientas de afrontamiento emocional: “Ansiedad vs. miedo”', categoria: 'Salud', modalidad: 'presencial', placeId: 'bosque', horas: 1, cupos: 25, ocupados: 10, fuente: FUENTES.diasBienestar },
  { id: 'a20', d: 11, inicio: '18:00', fin: '20:00', titulo: 'Obra de teatro', categoria: 'Cultura', modalidad: 'presencial', placeId: 'auditorio-mayor', horas: 5, cupos: 250, ocupados: 120, fuente: FUENTES.teatro },
  { id: 'a21', d: 11, inicio: '15:00', fin: '16:00', titulo: 'Pausa activa y snack saludable', categoria: 'Salud', modalidad: 'presencial', placeId: 'csu', horas: 1, cupos: 30, ocupados: 8, demo: true },
  // ---- Semana 3 ----
  { id: 'a22', d: 14, inicio: '16:00', fin: '18:00', titulo: 'Ágora InvestigandoAndo', categoria: 'Desarrollo humano', modalidad: 'presencial', placeId: 'auditorio-menor', horas: 2, cupos: 80, ocupados: 25, fuente: FUENTES.investigandoAndo, notaHoras: 'Certificada como horas libres; cantidad de horas: valor demo.' },
  { id: 'a23', d: 15, inicio: '12:00', fin: '13:00', titulo: 'Rumba aeróbica', categoria: 'Deporte', modalidad: 'presencial', placeId: 'gimnasio', horas: 1, cupos: 35, ocupados: 14, demo: true },
  { id: 'a24', d: 16, inicio: '18:00', fin: '20:00', titulo: 'Cine Club Cuarto Oscuro', categoria: 'Cultura', modalidad: 'virtual', placeId: 'virtual', horas: 3, cupos: 150, ocupados: 22, fuente: FUENTES.actividades },
  { id: 'a25', d: 16, inicio: '10:00', fin: '12:00', titulo: 'Taller de origami', categoria: 'Cultura', modalidad: 'presencial', placeId: 'banu', horas: 2, cupos: 20, ocupados: 4, demo: true },
  { id: 'a26', d: 17, inicio: '18:30', fin: '20:30', titulo: 'Cinestudio UNAB · cineforo', categoria: 'Cultura', modalidad: 'presencial', placeId: 'auditorio-menor', horas: 2, cupos: 90, ocupados: 18, fuente: FUENTES.cinestudio },
  { id: 'a27', d: 18, inicio: '10:00', fin: '11:00', titulo: 'Días de Bienestar: hábitos de sueño', categoria: 'Salud', modalidad: 'presencial', placeId: 'casona', horas: 2, cupos: 25, ocupados: 6, demo: true },
];

/** Descripción por tipo de actividad (para el detalle). */
const DESCRIPCIONES = {
  Salud: 'Actividad de promoción de la salud física y mental de Bienestar Universitario.',
  Deporte: 'Actividad física y recreativa dirigida por el área de deportes de Bienestar Universitario.',
  Cultura: 'Actividad cultural y artística de la agenda de Bienestar Universitario.',
  'Desarrollo humano': 'Espacio de diálogo y formación integral para la comunidad universitaria.',
};

/** Horario de clases de ejemplo (asignaturas ficticias de demostración). */
const DEMO_CLASSES = [
  { dia: 1, inicio: '07:00', fin: '09:00', materia: 'Cálculo Integral', salon: 'Aula demo 101' },
  { dia: 1, inicio: '14:00', fin: '16:00', materia: 'Programación Orientada a Objetos', salon: 'Lab. demo 2' },
  { dia: 2, inicio: '07:00', fin: '09:00', materia: 'Física Mecánica', salon: 'Aula demo 204' },
  { dia: 2, inicio: '14:00', fin: '16:00', materia: 'Inglés III', salon: 'Aula demo 305' },
  { dia: 3, inicio: '07:00', fin: '09:00', materia: 'Cálculo Integral', salon: 'Aula demo 101' },
  { dia: 3, inicio: '09:00', fin: '11:00', materia: 'Programación Orientada a Objetos', salon: 'Lab. demo 2' },
  { dia: 4, inicio: '08:00', fin: '10:00', materia: 'Física Mecánica', salon: 'Aula demo 204' },
  { dia: 4, inicio: '16:00', fin: '18:00', materia: 'Matemáticas Discretas', salon: 'Aula demo 110' },
  { dia: 5, inicio: '08:00', fin: '10:00', materia: 'Matemáticas Discretas', salon: 'Aula demo 110' },
];

/** Usuario de demostración (persona ficticia). */
const DEMO_USER = {
  nombre: 'Estudiante Demo', codigo: 'U00123456', correo: 'demo@unab.edu.co', password: 'Demo2026*',
  programa: 'Ingeniería de Sistemas', semestre: 2, telefono: '',
};

/** Historial de ejemplo: actividades reales ya cursadas (días antes de hoy). */
const DEMO_HISTORY = [
  [-75, '18:30', '20:30', 'Cinestudio UNAB · cineforo', 'auditorio-menor', 2, 'Cultura'],
  [-68, '08:00', '13:00', 'Feria de la Salud', 'coliseo-csu', 12, 'Salud'],
  [-61, '18:00', '20:00', 'Obra de teatro', 'auditorio-mayor', 5, 'Cultura'],
  [-47, '09:00', '11:00', 'Circuito funcional Full Body', 'gimnasio', 3, 'Deporte'],
  [-40, '18:00', '20:00', 'Cuentería en línea', 'virtual', 3, 'Cultura'],
  [-33, '10:00', '11:00', 'Día de Bienestar: derechos sexuales y reproductivos', 'virtual', 2, 'Salud'],
  [-26, '18:00', '20:00', 'Cine Club Cuarto Oscuro', 'virtual', 3, 'Cultura'],
  [-19, '10:00', '11:00', 'Herramientas de afrontamiento emocional: “Ansiedad vs. miedo”', 'bosque', 1, 'Salud'],
  [-12, '10:00', '12:00', 'Circuito funcional Cardio HIIT', 'coliseo-csu', 3, 'Deporte'],
  [-8, '18:30', '20:30', 'Cinestudio UNAB · cineforo', 'auditorio-menor', 2, 'Cultura'],
];

/** Lunes de la semana actual (si hoy es domingo, el lunes siguiente). */
function weekMonday() {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return addDays(t, t.getDay() === 0 ? 1 : 1 - t.getDay());
}

/** Construye los eventos con fechas reales a partir de la agenda. */
function buildEvents() {
  const mon = weekMonday();
  return AGENDA.map((a) => ({
    id: a.id, titulo: a.titulo, categoria: a.categoria, modalidad: a.modalidad, placeId: a.placeId,
    fecha: toISODate(addDays(mon, a.d)), inicio: a.inicio, fin: a.fin, horas: a.horas,
    cuposTotales: a.cupos, ocupadosBase: a.ocupados,
    descripcion: DESCRIPCIONES[a.categoria] || '', fuente: a.fuente || null, demo: !!a.demo, notaHoras: a.notaHoras || '',
  }));
}

/** Base de datos local inicial. */
function buildSeedDB() {
  const userId = 'u_demo';
  const events = buildEvents();
  const today = todayISO();
  const user = {
    id: userId, nombre: DEMO_USER.nombre, codigo: DEMO_USER.codigo, correo: DEMO_USER.correo,
    passwordHash: sha256(DEMO_USER.password), programa: DEMO_USER.programa, semestre: DEMO_USER.semestre,
    telefono: DEMO_USER.telefono, foto: '', creado: today, demo: true,
  };
  const history = DEMO_HISTORY.map(([off, inicio, fin, titulo, placeId, horas, categoria], i) => ({
    id: `h_seed_${i}`, userId, eventId: null, titulo, categoria, placeId, fecha: toISODate(addDays(new Date(), off)), inicio, fin, horas,
  }));

  // Inscripciones de ejemplo según el estado de la semana
  const past = events.filter((e) => e.fecha < today);
  const future = events.filter((e) => e.fecha > today && e.cuposTotales > e.ocupadosBase);
  const enrollments = [];
  const add = (ev, estado, extra = {}) => ev && enrollments.push({ id: `e_seed_${enrollments.length + 1}`, userId, eventId: ev.id, estado, qr: '', creado: today, ...extra });
  const pastVirtual = past.filter((e) => e.modalidad === 'virtual').pop();
  const pastPres = past.filter((e) => e.modalidad === 'presencial').pop();
  if (pastVirtual) add(pastVirtual, 'asistencia');           // falta responder la encuesta
  if (pastPres) add(pastPres, 'inscrita');                   // falta generar QR / registrar asistencia
  add(future.find((e) => e.modalidad === 'presencial' && e.placeId !== 'coliseo-csu'), 'inscrita');
  add(future.find((e) => e.modalidad === 'virtual'), 'inscrita');
  add(future.filter((e) => e.modalidad === 'presencial').slice(-1)[0], 'cancelada');

  return {
    version: 4,
    users: [user],
    places: DEMO_PLACES.map((p) => ({ ...p })),
    events,
    enrollments,
    history,
    classes: DEMO_CLASSES.map((c, i) => ({ id: `c_seed_${i}`, userId, ...c })),
  };
}
