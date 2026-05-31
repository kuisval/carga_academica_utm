// =====================================================
//  handlers/coordinador/crearGrupo.js
//  POST /api/coordinador/grupos
//  Body: { id_coordinador, id_materia, id_docente,
//          id_aula, id_horario, clave, cupo_max }
//  Crea un grupo en la oferta activa del coordinador.
//  Si no existe oferta en borrador la crea automáticamente.
//
//  Validaciones:
//    · Todos los campos requeridos
//    · El coordinador existe y tiene carrera asignada
//    · La materia pertenece a la carrera del coordinador
//    · No hay otro grupo con el mismo aula+horario (uk_aula_horario)
//    · No hay otro grupo con el mismo docente+horario (uk_docente_horario)
//    · La oferta no está ya publicada (no se pueden agregar grupos)
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  const { id_coordinador, id_materia, id_docente,
          id_aula, id_horario, clave, cupo_max } = req.body;

  if (!id_coordinador || !id_materia || !id_docente ||
      !id_aula || !id_horario || !clave || !cupo_max) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'Todos los campos son requeridos: id_coordinador, id_materia, id_docente, id_aula, id_horario, clave, cupo_max.'
    }));
  }

  if (cupo_max < 1 || cupo_max > 100) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'El cupo debe ser entre 1 y 100.' }));
  }

  try {
    const pool = await getPool();

    // 1. Verificar coordinador y obtener su carrera
    const coordRes = await pool.request()
      .input('id_coordinador', sql.Int, id_coordinador)
      .query(`
        SELECT co.id_carrera, oa.id_oferta, oa.periodo, oa.estado
        FROM coordinador co
        LEFT JOIN oferta_academica oa
          ON  oa.id_carrera     = co.id_carrera
          AND oa.id_coordinador = co.id_coordinador
        WHERE co.id_coordinador = @id_coordinador
        ORDER BY oa.id_oferta DESC
        OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
      `);

    if (coordRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Coordinador no encontrado.' }));
    }

    const coord = coordRes.recordset[0];

    // 2. Verificar que la materia pertenece a la carrera del coordinador
    const materiaRes = await pool.request()
      .input('id_materia', sql.Int, id_materia)
      .input('id_carrera', sql.Int, coord.id_carrera)
      .query(`
        SELECT id_materia FROM materia
        WHERE id_materia = @id_materia AND id_carrera = @id_carrera
      `);

    if (materiaRes.recordset.length === 0) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'La materia no pertenece a tu carrera.' }));
    }

    // 3. Verificar que la oferta no esté publicada
    if (coord.estado === 'publicada') {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'La oferta ya fue publicada. No se pueden agregar más grupos.'
      }));
    }

    // 4. Obtener o crear la oferta en borrador
    let id_oferta;

    if (coord.id_oferta && coord.estado === 'borrador') {
      id_oferta = coord.id_oferta;
    } else {
      // Crear nueva oferta en borrador para el periodo actual
      const periodo = new Date().getFullYear() + '-A';
      const nuevaOfertaRes = await pool.request()
        .input('periodo',        sql.VarChar, periodo)
        .input('id_carrera',     sql.Int,     coord.id_carrera)
        .input('id_coordinador', sql.Int,     id_coordinador)
        .query(`
          INSERT INTO oferta_academica (periodo, estado, id_carrera, id_coordinador)
          OUTPUT INSERTED.id_oferta
          VALUES (@periodo, 'borrador', @id_carrera, @id_coordinador)
        `);
      id_oferta = nuevaOfertaRes.recordset[0].id_oferta;
    }

    // 5. Insertar el grupo — las constraints uk_aula_horario y
    //    uk_docente_horario del esquema detectan conflictos automáticamente
    try {
      const grupoRes = await pool.request()
        .input('clave',      sql.VarChar, clave)
        .input('cupo_max',   sql.Int,     cupo_max)
        .input('id_materia', sql.Int,     id_materia)
        .input('id_docente', sql.Int,     id_docente)
        .input('id_aula',    sql.Int,     id_aula)
        .input('id_horario', sql.Int,     id_horario)
        .input('id_oferta',  sql.Int,     id_oferta)
        .query(`
          INSERT INTO grupo
            (clave, cupo_max, cupo_disponible, estado,
             id_materia, id_docente, id_aula, id_horario, id_oferta)
          OUTPUT INSERTED.id_grupo
          VALUES
            (@clave, @cupo_max, @cupo_max, 'disponible',
             @id_materia, @id_docente, @id_aula, @id_horario, @id_oferta)
        `);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok:        true,
        id_grupo:  grupoRes.recordset[0].id_grupo,
        id_oferta,
        mensaje:   'Grupo creado correctamente.'
      }));

    } catch (err) {
      // Unique key violations — conflicto de aula o docente en ese horario
      if (err.number === 2627 || err.number === 2601) {
        const esAula    = err.message.includes('uk_aula_horario');
        const esDocente = err.message.includes('uk_docente_horario');
        const msg = esAula
          ? 'Esa aula ya tiene un grupo asignado en ese horario.'
          : esDocente
            ? 'Ese docente ya tiene un grupo asignado en ese horario.'
            : 'Conflicto de horario: aula o docente ya ocupados.';
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: msg }));
      }
      throw err;
    }

  } catch (err) {
    console.error('Error en crearGrupo:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };