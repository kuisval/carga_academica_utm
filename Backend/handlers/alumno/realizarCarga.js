// =====================================================
//  handlers/alumno/realizarCarga.js
//  POST /api/alumno/carga
//  Body: { id_alumno, id_grupo, periodo }
//  Inserta una linea_carga (el trigger maneja el cupo)
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  const { id_alumno, id_grupo, periodo } = req.body;

  if (!id_alumno || !id_grupo || !periodo) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'id_alumno, id_grupo y periodo son requeridos.' }));
  }

  try {
    const pool = await getPool();

    // 1. Verificar que el alumno exista y tenga pago vigente
    const alumnoRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
          SELECT a.tipo_alumno, a.estado_pago, a.id_carrera, a.semestre
          FROM alumno a
          WHERE a.id_alumno = @id_alumno
      `);

    if (alumnoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Alumno no encontrado.' }));
    }

    const alumno = alumnoRes.recordset[0];

    if (alumno.estado_pago === 'adeudo') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Tienes un adeudo pendiente.' }));
    }

    // 2. Verificar que el grupo exista y tenga cupo
    const grupoRes = await pool.request()
      .input('id_grupo', sql.Int, id_grupo)
      .query(`
          SELECT g.estado, g.cupo_disponible, g.id_horario, m.id_carrera, m.semestre
          FROM grupo g
          JOIN materia m ON g.id_materia = m.id_materia
          WHERE g.id_grupo = @id_grupo
      `);

    if (grupoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Grupo no encontrado.' }));
    }

    const grupo = grupoRes.recordset[0];

    if (grupo.estado !== 'disponible' || grupo.cupo_disponible <= 0) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'El grupo no tiene cupo disponible.' }));
    }

    // 3. Verificar que el grupo pertenezca a la carrera del alumno
    if (grupo.id_carrera !== alumno.id_carrera) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'El grupo no corresponde a tu carrera.' }));
    }

    // 3.5 Verificar que la materia no sea de un semestre superior al alumno
    if (grupo.semestre > alumno.semestre) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: `No puedes inscribir materias de semestres superiores al tuyo (semestre ${alumno.semestre}).`
      }));
    }
    

    // 4. Obtener o crear la carga académica del alumno para este periodo
    let id_carga;

    const cargaRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .input('periodo',   sql.VarChar, periodo)
      .query(`
        SELECT id_carga, estado, total_grupos
        FROM carga_academica
        WHERE id_alumno = @id_alumno AND periodo = @periodo
      `);

    if (cargaRes.recordset.length === 0) {
      // Crear nueva carga
      const nuevaCargaRes = await pool.request()
        .input('id_alumno', sql.Int, id_alumno)
        .input('periodo',   sql.VarChar, periodo)
        .query(`
          INSERT INTO carga_academica (periodo, estado, total_grupos, id_alumno)
          OUTPUT INSERTED.id_carga
          VALUES (@periodo, 'en_proceso', 0, @id_alumno)
        `);
      id_carga = nuevaCargaRes.recordset[0].id_carga;
    } else {
      const carga = cargaRes.recordset[0];

      if (carga.estado === 'finalizada') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Tu carga académica ya fue finalizada.' }));
      }

      if (carga.estado === 'cancelada') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Tu carga académica fue cancelada.' }));
      }

      // 5. Validar carga máxima según tipo de alumno
      // regular: máx 7 materias | irregular: 70% = 4 materias
      const cargaMax = alumno.tipo_alumno === 'regular' ? 7 : 4;
      if (carga.total_grupos >= cargaMax) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: `Has alcanzado la carga máxima permitida (${cargaMax} materias).`
        }));
      }

      id_carga = carga.id_carga;
    }

    // 6. Verificar conflicto de horario con grupos ya inscritos
    const conflictoRes = await pool.request()
      .input('id_carga',   sql.Int, id_carga)
      .input('id_horario', sql.Int, grupo.id_horario)
      .query(`
        SELECT COUNT(*) AS total
        FROM linea_carga lc
        JOIN grupo g ON lc.id_grupo = g.id_grupo
        WHERE lc.id_carga    = @id_carga
          AND g.id_horario   = @id_horario
      `);

    if (conflictoRes.recordset[0].total > 0) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Conflicto de horario con otro grupo ya inscrito.' }));
    }

    // 7. Insertar línea de carga (el trigger reduce el cupo automáticamente)
    try {
      await pool.request()
        .input('id_carga', sql.Int, id_carga)
        .input('id_grupo', sql.Int, id_grupo)
        .query(`
          INSERT INTO linea_carga (id_carga, id_grupo)
          VALUES (@id_carga, @id_grupo)
        `);
    } catch (err) {
      // UK violation: el alumno ya tiene ese grupo inscrito
      if (err.number === 2627 || err.number === 2601) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Ya tienes ese grupo inscrito.' }));
      }
      throw err;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok:       true,
      id_carga,
      mensaje:  'Grupo inscrito correctamente.'
    }));

  } catch (err) {
    console.error('Error en realizarCarga:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };
