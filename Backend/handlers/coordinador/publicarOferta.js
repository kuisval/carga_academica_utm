// =====================================================
//  handlers/coordinador/publicarOferta.js
//  POST /api/coordinador/oferta/publicar
//  Body: { id_coordinador }
//  Publica la oferta en borrador del coordinador.
//
//  Validaciones:
//    · id_coordinador requerido
//    · Existe una oferta en borrador para ese coordinador
//    · La oferta tiene al menos un grupo disponible
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  const { id_coordinador } = req.body;

  if (!id_coordinador) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'id_coordinador es requerido.' }));
  }

  try {
    const pool = await getPool();

    // 1. Buscar la oferta en borrador del coordinador
    const ofertaRes = await pool.request()
      .input('id_coordinador', sql.Int, id_coordinador)
      .query(`
        SELECT TOP 1 id_oferta, periodo, estado
        FROM oferta_academica
        WHERE id_coordinador = @id_coordinador
          AND estado = 'borrador'
        ORDER BY id_oferta DESC
      `);

    if (ofertaRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'No tienes una oferta en borrador para publicar.'
      }));
    }

    const oferta = ofertaRes.recordset[0];

    // 2. Verificar que tenga al menos un grupo
    const gruposRes = await pool.request()
      .input('id_oferta', sql.Int, oferta.id_oferta)
      .query(`
        SELECT COUNT(*) AS total
        FROM grupo
        WHERE id_oferta = @id_oferta
          AND estado != 'cancelado'
      `);

    if (gruposRes.recordset[0].total === 0) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'No puedes publicar una oferta sin grupos. Agrega al menos un grupo primero.'
      }));
    }

    // 3. Publicar
    await pool.request()
      .input('id_oferta', sql.Int, oferta.id_oferta)
      .query(`
        UPDATE oferta_academica
        SET estado = 'publicada'
        WHERE id_oferta = @id_oferta
      `);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok:       true,
      id_oferta: oferta.id_oferta,
      periodo:   oferta.periodo,
      mensaje:   `Oferta ${oferta.periodo} publicada correctamente. Los alumnos ya pueden inscribirse.`
    }));

  } catch (err) {
    console.error('Error en publicarOferta:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };