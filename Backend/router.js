// =====================================================
//  router.js – Enruta peticiones a sus handlers
// =====================================================

const auth           = require('./handlers/alumno/auth');
const getGrupos      = require('./handlers/alumno/getGrupos');
const realizarCarga  = require('./handlers/alumno/realizarCarga');
const bajaMateria    = require('./handlers/alumno/bajaMateria');
const getInfo        = require('./handlers/alumno/getInfo');
const getMaterias    = require('./handlers/coordinador/getMaterias');
const crearGrupo     = require('./handlers/coordinador/crearGrupo');
const eliminarGrupo  = require('./handlers/coordinador/eliminarGrupo');
const publicarOferta = require('./handlers/coordinador/publicarOferta');
const getReticula    = require('./handlers/alumno/getReticula');

function handle(req, res) {
  const { method } = req;
  const pathname   = req.url.split('?')[0];

  // ── AUTH ──────────────────────────────────────────
  if (method === 'POST'   && pathname === '/api/auth/login')
    return auth.login(req, res);

  // ── ALUMNO ────────────────────────────────────────
  if (method === 'GET'    && pathname === '/api/alumno/grupos')
    return getGrupos.handle(req, res);

  if (method === 'GET'    && pathname === '/api/alumno/info')
    return getInfo.handle(req, res);

  if (method === 'POST'   && pathname === '/api/alumno/carga')
    return realizarCarga.handle(req, res);

  if (method === 'DELETE' && pathname === '/api/alumno/carga')
    return bajaMateria.handle(req, res);

  if (method === 'GET'    && pathname === '/api/alumno/reticula')
    return getReticula.handle(req, res);

  // ── COORDINADOR ───────────────────────────────────
  if (method === 'GET'    && pathname === '/api/coordinador/materias')
    return getMaterias.handle(req, res);

  if (method === 'POST'   && pathname === '/api/coordinador/grupos')
    return crearGrupo.handle(req, res);

  if (method === 'DELETE' && pathname.startsWith('/api/coordinador/grupos/'))
    return eliminarGrupo.handle(req, res);

  if (method === 'POST'   && pathname === '/api/coordinador/oferta/publicar')
    return publicarOferta.handle(req, res);

  // ── 404 ───────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada.' }));
}

module.exports = { handle };