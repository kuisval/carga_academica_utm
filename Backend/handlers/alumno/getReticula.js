// =====================================================
//  handlers/alumno/getReticula.js
//  GET /api/alumno/reticula?id_alumno=1
//  Retorna todas las materias del plan de estudios
//  de la carrera del alumno, agrupadas por semestre.
//  Marca cuáles están inscritas en la carga activa.
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

    // 1. Datos del alumno y su carrera
    const alumnoRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
        SELECT
          a.id_carrera,
          a.semestre   AS semestre_actual,
          c.nombre     AS carrera,
          c.clave      AS carrera_clave
        FROM alumno a
        JOIN carrera c ON c.id_carrera = a.id_carrera
        WHERE a.id_alumno = @id_alumno
      `);

    if (alumnoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Alumno no encontrado.' }));
    }

    const alumno = alumnoRes.recordset[0];

    // 2. Todas las materias del plan de estudios
    const materiasRes = await pool.request()
      .input('id_carrera', sql.Int, alumno.id_carrera)
      .query(`
        SELECT id_materia, clave, nombre, creditos, semestre
        FROM materia
        WHERE id_carrera = @id_carrera
        ORDER BY semestre, nombre
      `);

    // 3. Materias inscritas en la carga activa más reciente
    const inscritasRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
        SELECT m.id_materia
        FROM carga_academica ca
        JOIN linea_carga lc ON lc.id_carga  = ca.id_carga
        JOIN grupo       g  ON g.id_grupo   = lc.id_grupo
        JOIN materia     m  ON m.id_materia = g.id_materia
        WHERE ca.id_alumno = @id_alumno
          AND ca.estado IN ('en_proceso', 'finalizada')
        ORDER BY ca.id_carga DESC
      `);

    // Set de ids inscritos para lookup O(1)
    const inscritasSet = new Set(
      inscritasRes.recordset.map(r => r.id_materia)
    );

    // 4. Agrupar por semestre
    const semestresMap = {};
    for (const m of materiasRes.recordset) {
      const sem = m.semestre;
      if (!semestresMap[sem]) {
        semestresMap[sem] = { semestre: sem, materias: [] };
      }
      semestresMap[sem].materias.push({
        id_materia: m.id_materia,
        clave:      m.clave,
        nombre:     m.nombre,
        creditos:   m.creditos,
        inscrita:   inscritasSet.has(m.id_materia)
      });
    }

    const semestres = Object.values(semestresMap)
      .sort((a, b) => a.semestre - b.semestre);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      carrera:         alumno.carrera,
      carrera_clave:   alumno.carrera_clave,
      semestre_actual: alumno.semestre_actual,
      semestres
    }));

  } catch (err) {
    console.error('Error en getReticula:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };