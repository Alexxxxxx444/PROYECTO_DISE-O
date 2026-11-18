// Exporta los datos de js/data.js a php/seed.json (misma fuente para ambos backends)
const fs = require('fs'); const path = require('path');
const root = process.argv[2];
const code = ['js/config.js', 'js/utils.js', 'js/data.js'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const out = new Function(`${code}; return { places: DEMO_PLACES, agenda: AGENDA, descripciones: DESCRIPCIONES, classes: DEMO_CLASSES, history: DEMO_HISTORY, user: DEMO_USER };`)();
fs.writeFileSync(path.join(root, 'php/seed.json'), JSON.stringify(out, null, 1));
console.log('seed.json:', out.places.length, 'lugares,', out.agenda.length, 'actividades');
