// =====================================================
//  handlers/coordinador/eliminarGrupo.js
//  DELETE /api/coordinador/grupos/:id_grupo
//  Body: { id_coordinador }
//
//  Validaciones:
//    · El grupo existe y pertenece a la oferta del coordinador
//    · La oferta no está publicada
//    · El grupo no tiene alumnos inscritos (linea_carga)
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  // Extraer id_grupo de la URL: /api/coordinador/grupos/5
  const id_grupo       = parseInt(req.url.split('/').pop());
  const { id_coordinador } = req.body;

  if (!id_grupo || !id_coordinador) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'id_grupo e id_coordinador son requeridos.' }));
  }

  try {
    const pool = await getPool();

    // 1. Verificar que el grupo pertenece a una oferta de este coordinador
    const grupoRes = await pool.request()
      .input('id_grupo',       sql.Int, id_grupo)
      .input('id_coordinador', sql.Int, id_coordinador)
      .query(`
        SELECT g.id_grupo, g.clave, oa.estado AS oferta_estado
        FROM grupo g
        JOIN oferta_academica oa ON oa.id_oferta = g.id_oferta
        WHERE g.id_grupo         = @id_grupo
          AND oa.id_coordinador  = @id_coordinador
      `);

    if (grupoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Grupo no encontrado o no tienes permiso para eliminarlo.' }));
    }

    const grupo = grupoRes.recordset[0];

    // 2. No se puede eliminar si la oferta ya está publicada
    if (grupo.oferta_estado === 'publicada') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'No puedes eliminar grupos de una oferta ya publicada.'
      }));
    }

    // 3. No se puede eliminar si hay alumnos inscritos en el grupo
    const inscritosRes = await pool.request()
      .input('id_grupo', sql.Int, id_grupo)
      .query(`
        SELECT COUNT(*) AS total
        FROM linea_carga
        WHERE id_grupo = @id_grupo
      `);

    if (inscritosRes.recordset[0].total > 0) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'No puedes eliminar un grupo que ya tiene alumnos inscritos.'
      }));
    }

    // 4. Eliminar
    await pool.request()
      .input('id_grupo', sql.Int, id_grupo)
      .query(`DELETE FROM grupo WHERE id_grupo = @id_grupo`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok:      true,
      mensaje: `Grupo ${grupo.clave} eliminado correctamente.`
    }));

  } catch (err) {
    console.error('Error en eliminarGrupo:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };
