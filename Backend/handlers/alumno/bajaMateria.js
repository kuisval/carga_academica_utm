// =====================================================
//  handlers/alumno/bajaMateria.js
//  DELETE /api/alumno/carga
//  Body: { id_alumno, id_grupo, periodo }
//  Elimina una linea_carga (el trigger restaura el cupo
//  y decrementa total_grupos automáticamente)
//
//  Validaciones:
//    · Alumno existe y tiene pago vigente
//    · La carga existe y está en_proceso (no finalizada)
//    · El grupo efectivamente está inscrito en esa carga
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  const { id_alumno, id_grupo, periodo } = req.body;

  if (!id_alumno || !id_grupo || !periodo) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'id_alumno, id_grupo y periodo son requeridos.'
    }));
  }

  try {
    const pool = await getPool();

    // 1. Verificar alumno
    const alumnoRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
        SELECT estado_pago FROM alumno WHERE id_alumno = @id_alumno
      `);

    if (alumnoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Alumno no encontrado.' }));
    }

    if (alumnoRes.recordset[0].estado_pago === 'adeudo') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Tienes un adeudo pendiente.' }));
    }

    // 2. Obtener la carga del alumno para ese periodo
    const cargaRes = await pool.request()
      .input('id_alumno', sql.Int,     id_alumno)
      .input('periodo',   sql.VarChar, periodo)
      .query(`
        SELECT id_carga, estado
        FROM carga_academica
        WHERE id_alumno = @id_alumno AND periodo = @periodo
      `);

    if (cargaRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No tienes una carga activa para este periodo.' }));
    }

    const carga = cargaRes.recordset[0];

    if (carga.estado === 'finalizada') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Tu carga académica ya fue finalizada. No puedes dar de baja materias.' }));
    }

    if (carga.estado === 'cancelada') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Tu carga académica fue cancelada.' }));
    }

    // 3. Verificar que el grupo esté inscrito en esta carga
    const lineaRes = await pool.request()
      .input('id_carga', sql.Int, carga.id_carga)
      .input('id_grupo', sql.Int, id_grupo)
      .query(`
        SELECT id_linea FROM linea_carga
        WHERE id_carga = @id_carga AND id_grupo = @id_grupo
      `);

    if (lineaRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Ese grupo no está en tu carga académica.' }));
    }

    // 4. Eliminar la línea — el trigger trg_linea_carga_delete
    //    restaura cupo_disponible en grupo y decrementa total_grupos
    await pool.request()
      .input('id_carga', sql.Int, carga.id_carga)
      .input('id_grupo', sql.Int, id_grupo)
      .query(`
        DELETE FROM linea_carga
        WHERE id_carga = @id_carga AND id_grupo = @id_grupo
      `);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok:      true,
      mensaje: 'Materia dada de baja correctamente.'
    }));

  } catch (err) {
    console.error('Error en bajaMateria:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };
