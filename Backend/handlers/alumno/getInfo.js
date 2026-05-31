// =====================================================
//  handlers/alumno/getInfo.js
//  GET /api/alumno/info?id_alumno=1
//  Retorna:
//    · datos personales del alumno
//    · carga activa (en_proceso o finalizada) del periodo vigente
//    · grupos inscritos con horario completo
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

    // 1. Datos del alumno + usuario + carrera
    const alumnoRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
        SELECT
          u.nombre,
          u.email,
          a.matricula,
          a.semestre,
          a.tipo_alumno,
          a.estado_pago,
          c.nombre  AS carrera,
          c.clave   AS carrera_clave
        FROM alumno a
        JOIN usuario  u ON u.id_usuario  = a.id_alumno
        JOIN carrera  c ON c.id_carrera  = a.id_carrera
        WHERE a.id_alumno = @id_alumno
      `);

    if (alumnoRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Alumno no encontrado.' }));
    }

    const alumno = alumnoRes.recordset[0];

    // 2. Carga activa más reciente (en_proceso o finalizada)
    const cargaRes = await pool.request()
      .input('id_alumno', sql.Int, id_alumno)
      .query(`
        SELECT TOP 1
          id_carga,
          periodo,
          estado,
          total_grupos
        FROM carga_academica
        WHERE id_alumno = @id_alumno
          AND estado IN ('en_proceso', 'finalizada')
        ORDER BY id_carga DESC
      `);

    // Sin carga activa → devolvemos el alumno sin grupos
    if (cargaRes.recordset.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        alumno,
        carga:   null,
        grupos:  [],
        periodo: ''
      }));
    }

    const carga = cargaRes.recordset[0];

    // 3. Grupos inscritos en esa carga
    const gruposRes = await pool.request()
      .input('id_carga', sql.Int, carga.id_carga)
      .query(`
        SELECT
          g.id_grupo,
          g.clave          AS grupo_clave,
          m.nombre         AS materia,
          m.clave          AS materia_clave,
          m.creditos,
          ud.nombre        AS docente,
          a.numero         AS aula_numero,
          a.edificio,
          h.dias,
          h.hora_inicio,
          h.hora_fin
        FROM linea_carga lc
        JOIN grupo    g  ON g.id_grupo   = lc.id_grupo
        JOIN materia  m  ON m.id_materia = g.id_materia
        JOIN docente  d  ON d.id_docente = g.id_docente
        JOIN usuario  ud ON ud.id_usuario = d.id_docente
        JOIN aula     a  ON a.id_aula    = g.id_aula
        JOIN horario  h  ON h.id_horario = g.id_horario
        WHERE lc.id_carga = @id_carga
        ORDER BY h.hora_inicio
      `);

    const grupos = gruposRes.recordset.map(r => ({
      id_grupo:     r.id_grupo,
      clave:        r.grupo_clave,
      materia:      r.materia,
      materia_clave: r.materia_clave,
      creditos:     r.creditos,
      docente:      r.docente,
      aula:         `${r.aula_numero} — ${r.edificio}`,
      horario: {
        dias:        r.dias,
        hora_inicio: r.hora_inicio,
        hora_fin:    r.hora_fin
      }
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      alumno,
      carga,
      grupos,
      periodo: carga.periodo
    }));

  } catch (err) {
    console.error('Error en getInfo:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };