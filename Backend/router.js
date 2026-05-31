// =====================================================
//  router.js – Enruta peticiones a sus handlers
// =====================================================

const auth = require('./handlers/alumno/auth');

// Aquí se irán agregando los demás handlers conforme avancemos
const getGrupos      = require('./handlers/alumno/getGrupos');
const realizarCarga  = require('./handlers/alumno/realizarCarga');
const getInfo        = require('./handlers/alumno/getInfo');
const getMaterias    = require('./handlers/coordinador/getMaterias');
const crearGrupo     = require('./handlers/coordinador/crearGrupo');
const publicarOferta = require('./handlers/coordinador/publicarOferta');
// const getHorario     = require('./handlers/docente/getHorario');

function handle(req, res) {
  const { method, url } = req;

  // ── AUTH ──────────────────────────────────────────
  if (method === 'POST' && url === '/api/auth/login') {
    return auth.login(req, res);
  }

  // ── ALUMNO ────────────────────────────────────────
  if (method === 'GET'  && url.startsWith('/api/alumno/grupos'))  return getGrupos.handle(req, res);
  if (method === 'POST' && url === '/api/alumno/carga')           return realizarCarga.handle(req, res);
  if (method === 'GET'  && url.startsWith('/api/alumno/info'))    return getInfo.handle(req, res);

  // ── COORDINADOR ───────────────────────────────────
  if (method === 'GET'  && url.startsWith('/api/coordinador/materias')) return getMaterias.handle(req, res);
  if (method === 'POST' && url === '/api/coordinador/grupos')           return crearGrupo.handle(req, res);
  if (method === 'POST' && url === '/api/coordinador/oferta/publicar')  return publicarOferta.handle(req, res);

  // ── DOCENTE ───────────────────────────────────────
  // if (method === 'GET' && url.startsWith('/api/docente/horario')) return getHorario.handle(req, res);

  // ── 404 ───────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada.' }));
}

module.exports = { handle };
