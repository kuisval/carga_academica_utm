// =====================================================
//  handlers/alumno/getGrupos.js
//  GET /api/alumno/grupos?id_alumno=1
//  Retorna los grupos disponibles filtrados por carrera
//  del alumno, agrupados por materia
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  const params    = new URL(req.url, 'http://localhost').searchParams;
  const id_alumno = parseInt(params.get('id_alumno'));

  if (!id_alumno) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'id_alumno es requerido.' }));
  }

  try {
    const pool = await getPool();

    // 1. Obtener datos del alumno
    const alumnoRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
        SELECT
          a.semestre,
          a.tipo_alumno,
          a.estado_pago,
          a.id_carrera,
          c.nombre AS carrera
        FROM alumno a
        JOIN carrera c ON a.id_carrera = c.id_carrera
        WHERE a.id_alumno = @id_alumno
      `);

    if (alumnoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Alumno no encontrado.' }));
    }

    const alumno = alumnoRes.recordset[0];

    // 2. Obtener grupos disponibles de la carrera del alumno
    //    CONVERT(VARCHAR(5), hora, 108) fuerza el formato 'HH:MM'
    //    y evita que mssql serialice TIME como objeto Date en el JSON
    const gruposRes = await pool.request()
      .input('id_carrera', sql.Int, alumno.id_carrera)
      .query(`
        SELECT
          g.id_grupo,
          g.clave                                    AS grupo_clave,
          g.cupo_disponible,
          g.cupo_max,
          m.id_materia,
          m.nombre                                   AS materia,
          m.clave                                    AS materia_clave,
          m.creditos,
          ud.nombre                                  AS docente,
          a.numero                                   AS aula_numero,
          a.edificio,
          h.id_horario,
          h.dias,
          CONVERT(VARCHAR(5), h.hora_inicio, 108)    AS hora_inicio,
          CONVERT(VARCHAR(5), h.hora_fin,    108)    AS hora_fin,
          oa.periodo
        FROM grupo g
        JOIN materia          m  ON g.id_materia  = m.id_materia
        JOIN docente          d  ON g.id_docente  = d.id_docente
        JOIN usuario          ud ON d.id_docente  = ud.id_usuario
        JOIN aula             a  ON g.id_aula     = a.id_aula
        JOIN horario          h  ON g.id_horario  = h.id_horario
        JOIN oferta_academica oa ON g.id_oferta   = oa.id_oferta
        WHERE g.estado     = 'disponible'
          AND oa.estado    = 'publicada'
          AND m.id_carrera = @id_carrera
        ORDER BY m.nombre, g.clave
      `);

    // 3. Agrupar por materia
    const materiasMap = {};
    for (const row of gruposRes.recordset) {
      if (!materiasMap[row.id_materia]) {
        materiasMap[row.id_materia] = {
          id_materia: row.id_materia,
          nombre:     row.materia,
          clave:      row.materia_clave,
          creditos:   row.creditos,
          grupos:     []
        };
      }
      materiasMap[row.id_materia].grupos.push({
        id_grupo:        row.id_grupo,
        clave:           row.grupo_clave,
        cupo_disponible: row.cupo_disponible,
        cupo_max:        row.cupo_max,
        docente:         row.docente,
        aula:            `${row.aula_numero} — ${row.edificio}`,
        horario: {
          id_horario:  row.id_horario,
          dias:        row.dias,
          hora_inicio: row.hora_inicio,   // 'HH:MM' garantizado
          hora_fin:    row.hora_fin        // 'HH:MM' garantizado
        }
      });
    }

    const materias = Object.values(materiasMap);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      alumno: {
        tipo_alumno: alumno.tipo_alumno,
        carrera:     alumno.carrera
      },
      periodo:  gruposRes.recordset[0]?.periodo || '',
      materias
    }));

  } catch (err) {
    console.error('Error en getGrupos:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };