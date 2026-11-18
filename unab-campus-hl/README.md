# UNAB Campus HL

Portal web para consultar y gestionar las **Horas Libres (HL)** de los estudiantes de la Universidad Autónoma de Bucaramanga.
Proyecto académico: Luis Alexander Rojas Bernal, David Santiago Hernández Cristancho y Dominik Maffiold.

Tecnologías: HTML5, CSS3 nativo, JavaScript vanilla y PHP 8 (PDO + SQLite/MySQL). No usa frameworks.
Única biblioteca externa: `js/vendor/qrcode.js` (generador de códigos QR, licencia MIT).

Identidad visual (Manual de Identidad de Marca UNAB):
- Azul Facultad de Ciencias de la Salud `#00AFF1` (pág. 43) como color protagonista; naranja institucional `#E9A427` solo como acento.
- Isotipo UNAB (pág. 5) en el azul `#00AFF1` para el favicon y el logotipo.
- Familia iconográfica oficial (pág. 92): 50 íconos vectorizados en `js/unab-icons.js`.
- Tipografías: Open Sans (comunicación) y Poppins solo en el logotipo de submarca, como indica el manual.

---

## Cómo ejecutarlo

### Opción A: con PHP (recomendada para la entrega)
Los datos se guardan en una base de datos del servidor.

```bash
cd unab-campus-hl
php -S localhost:8000
```
Abra `http://localhost:8000`. La base de datos SQLite (`php/data/campus_hl.sqlite`) se crea sola la primera vez.

**Con XAMPP/MySQL:** copie la carpeta en `htdocs/`, importe `php/schema.sql` en phpMyAdmin, cambie `DB_DRIVER` a `'mysql'` en `php/config.php` y abra `http://localhost/unab-campus-hl/`.

### Opción B: sin servidor (demostración)
Abra `index.html` con doble clic. El portal detecta que no hay PHP y guarda los datos en el **localStorage de ese navegador**. En este modo los datos no están en ningún servidor: solo existen en ese navegador. El pie de cada página muestra qué modo está activo.

### Cuenta de demostración
- Correo: `demo@unab.edu.co`
- Contraseña: `Demo2026*`

También puede crear una cuenta nueva desde **Crear cuenta**.

---

## Estructura

```
index.html          Inicio de sesión (+ restablecer contraseña)
registro.html       Registro de estudiantes
inicio.html         Dashboard (avance, agenda, noticias, acceso rápido, servicios UNAB)
cronograma.html     Agenda / cronograma de actividades de Bienestar
mis-lugares.html    Mis inscripciones: QR, confirmar asistencia, encuesta, cancelar
horas-libres.html   Gestión de HL e historial
lugares.html        Lugares del campus (tarjetas + mapa Jardín/CSU)
noticias.html       Noticias UNAB con buscador
perfil.html         Perfil del estudiante
horario.html        Horario semanal (F07)
constancia.html     Constancia imprimible (F10)
css/   variables · base · components · layout · pages · print
js/    config · utils · icons · data (demo) · validators · api · ui · places-ui · campus-map · theme
js/pages/  un script por página
php/   config · db · lib · api · schema.sql
assets/img/  ilustraciones de los lugares y favicon
```

`js/api.js` expone las mismas acciones con dos backends: `PhpBackend` (php/api.php) y `LocalBackend` (localStorage). `CONFIG.BACKEND` en `js/config.js` permite forzar uno (`'auto' | 'php' | 'local'`).

---

## Funcionalidades

| Módulo / funcionalidad | Dónde |
|---|---|
| Login con validación de `@unab.edu.co`, mostrar/ocultar contraseña, recordar sesión, restablecer contraseña | `index.html` |
| Registro con validación en tiempo real, código `U00` + 6 dígitos, aceptación de datos, prevención de duplicados | `registro.html` |
| Dashboard: bienvenida, KPI, progreso, horas por lugar, próximas actividades, sugerencias, accesos rápidos | `inicio.html` |
| Perfil: edición, foto, cambio de contraseña, eliminación de cuenta | `perfil.html` |
| **F01** Barra de progreso de HL frente a las 48 h (se actualiza al completar una actividad) | dashboard, horas libres, barra lateral |
| **F02** Búsqueda y filtros por nombre, tipo (cultura, deporte, salud, cafetería, virtual) y disponibilidad | `lugares.html`, `cronograma.html` |
| **F03** Cupos por lugar y por actividad (bajan al inscribirse y suben al cancelar) | `lugares.html`, `cronograma.html` |
| **F04** Cancelación con confirmación | `mis-lugares.html` |
| **F05** Historial con búsqueda, filtros y orden | `horas-libres.html` |
| **F06** Mapa interactivo con planos de Campus El Jardín y CSU, puntos accesibles por teclado | `lugares.html?vista=mapa` |
| **F07** Horario semanal: CRUD de clases, espacios libres y sugerencias | `horario.html` |
| **F08** Modo claro/oscuro guardado en `localStorage`: botón en la barra superior, botón flotante y atajo **Alt + T** | todas las páginas |
| **F09** Indicador de seguridad de contraseña | registro, restablecer y cambiar contraseña |
| **F10** Constancia imprimible / PDF | `constancia.html` |

### Flujo de Horas Libres (igual al de MiPortalU)
1. **Inscribirse** en una actividad de la agenda (se descuenta un cupo).
2. **Presencial:** "Generar código QR" y presentarlo en el evento (en la demo, "Simular escaneo"). **Virtual:** "Confirmar asistencia". Ambos se habilitan el día de la actividad.
3. **Responder la encuesta de satisfacción** (6 preguntas).
4. La inscripción queda **Completada**, las horas pasan al historial y el progreso se recalcula.

Fuente del proceso: https://unab.edu.co/esta-es-la-nueva-forma-en-que-debes-registrar-tus-horas-libres

### Actividades y datos reales usados
- **48 horas libres** requeridas (valor definido por el grupo; configurable en `js/config.js` y `php/config.php`).
- Actividades con su publicación UNAB enlazada en la agenda ("Actividad real UNAB"): Cine Club (3 HL), Cinestudio (2 HL), Teatro (5 HL), Cuentería (3 HL), Días de Bienestar (2 HL), Herramientas de afrontamiento emocional (1 HL), Body Combat (2 HL), circuitos funcionales (3 HL), Feria de la Salud (hasta 12 HL), yoga y meditación en el CSU, donación de sangre, InvestigandoAndo, Come Bien.
- Actividades marcadas "Ejemplo" (sin publicación encontrada): taller de origami, rumba aeróbica, arteterapia, jornada de recreación deportiva (19 de noviembre), pausa activa, hábitos de sueño.
- Las fechas se generan relativas a la semana actual; cupos y algunas horas (indicadas en cada actividad) son de demostración.
- Datos en `js/data.js`. Si los cambias, ejecuta `node tools/export_seed.js .` para actualizar `php/seed.json` (el backend PHP usa ese archivo).

### Google Maps
En **Lugares del campus** (y desde el inicio) hay un mapa de Google Maps del Campus El Jardín (Av. 42 N.° 48-11) y del CSU (Cra. 47 N.° 53-78), con botones "Cómo llegar" y "Abrir en Google Maps". No necesita clave de API, pero sí conexión a internet.

### Noticias
- Con PHP: noticias **en vivo** de unab.edu.co (API de WordPress o RSS), caché de 15 minutos y búsqueda en el servidor (`php/news.php`).
- Las noticias de **MiPortalU requieren iniciar sesión** con usuario UNAB, por eso no se pueden leer automáticamente; la página enlaza a `notipagprincipal.php`.
- Sin servidor o sin conexión: se muestra una selección guardada de publicaciones reales con su enlace.

---

## Datos de demostración (pendientes de confirmar)

Los documentos del proyecto no definen estos datos, así que se dejaron configurables y marcados como demo en la interfaz:

- **Ubicaciones exactas** de Banú, Gimnasio y las cafeterías; **cupos** de las actividades.
- **Categoría de Banú** (se asumió "Cultura") y sede de la Cafetería Bosque.
- **Mapa del campus (F06)**: tiene dos planos, **Campus El Jardín** y **CSU**. Para usar los planos oficiales:
  1. Guarde las imágenes como `assets/img/mapa-jardin.jpg` y `assets/img/mapa-csu.jpg`.
  2. Abra `lugares.html?vista=mapa&calibrar=1` y haga clic sobre el plano donde va cada lugar: aparecen las coordenadas (en %).
  3. Copie esas coordenadas en `mapa: { x, y }` (y `campus: 'jardin'` o `'csu'`) de cada lugar en `js/data.js` y actualice `php/seed.json`.
  Mientras falte una imagen, se muestra un plano ilustrativo marcado como no oficial.
- **Fotografías**: tomadas del sitio público de la UNAB (unab.edu.co) y guardadas en `assets/img/fotos/`, con velo azul y marca de agua (isotipo + "Foto: UNAB"). Uso académico con crédito; confirmen con el docente si se requiere autorización para publicarlas. La asignación foto–lugar es ilustrativa (no son fotos de cada lugar exacto).
- **Política de tratamiento de datos**: texto de ejemplo en `js/pages/registro.js`.
- Estudiante y asignaturas de ejemplo: ficticios.

## Pruebas realizadas
Se probó de forma automatizada en Chrome (escritorio 1440 px y móvil 390 px), en modo local y con PHP: registro (validaciones, duplicados), login, inscripción y cupos, filtros, mapa, cancelación, asistencia → progreso e historial, perfil, horario (agregar, cruce, eliminar, sugerencias), modo oscuro persistente, constancia, protección de páginas sin sesión, sin errores de JavaScript ni desbordamiento horizontal.
