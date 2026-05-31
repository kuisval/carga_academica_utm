// =====================================================
//  handlers/coordinador/getMaterias.js
//  GET /api/coordinador/materias?id_coordinador=2
//  Retorna:
//    · datos del coordinador y su carrera
//    · materias de esa carrera
//    · aulas, horarios y docentes disponibles
//      (todo lo necesario para el formulario de crearGrupo)
//    · oferta activa (borrador o publicada) de la carrera
//    · grupos existentes en esa oferta
// =====================================================

const { getPool, sql } = require('../../db');

async function handle(req, res) {
  const params         = new URL(req.url, 'http://localhost').searchParams;
  const id_coordinador = parseInt(params.get('id_coordinador'));

  if (!id_coordinador) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'id_coordinador es requerido.' }));
  }

  try {
    const pool = await getPool();

    // 1. Datos del coordinador + carrera
    const coordRes = await pool.request()
      .input('id_coordinador', sql.Int, id_coordinador)
      .query(`
        SELECT
          u.nombre,
          c.id_carrera,
          c.nombre  AS carrera,
          c.clave   AS carrera_clave
        FROM coordinador co
        JOIN usuario  u ON u.id_usuario = co.id_coordinador
        JOIN carrera  c ON c.id_carrera = co.id_carrera
        WHERE co.id_coordinador = @id_coordinador
      `);

    if (coordRes.recordset.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Coordinador no encontrado.' }));
    }

    const coord = coordRes.recordset[0];

    // 2. Materias de la carrera
    const materiasRes = await pool.request()
      .input('id_carrera', sql.Int, coord.id_carrera)
      .query(`
        SELECT id_materia, clave, nombre, creditos
        FROM materia
        WHERE id_carrera = @id_carrera
        ORDER BY nombre
      `);

    // 3. Aulas disponibles
    const aulasRes = await pool.request()
      .query(`
        SELECT id_aula, numero, edificio, capacidad
        FROM aula
        ORDER BY edificio, numero
      `);

    // 4. Horarios disponibles
    const horariosRes = await pool.request()
      .query(`
        SELECT
          id_horario,
          dias,
          CONVERT(VARCHAR(5), hora_inicio, 108) AS hora_inicio,
          CONVERT(VARCHAR(5), hora_fin,    108) AS hora_fin
        FROM horario
        ORDER BY hora_inicio
      `);

    // 5. Docentes disponibles
    const docentesRes = await pool.request()
      .query(`
        SELECT d.id_docente, u.nombre, d.especialidad
        FROM docente d
        JOIN usuario u ON u.id_usuario = d.id_docente
        ORDER BY u.nombre
      `);

    // 6. Oferta activa de la carrera (la más reciente que no esté cancelada)
    const ofertaRes = await pool.request()
      .input('id_carrera',     sql.Int, coord.id_carrera)
      .input('id_coordinador', sql.Int, id_coordinador)
      .query(`
        SELECT TOP 1
          id_oferta, periodo, estado
        FROM oferta_academica
        WHERE id_carrera     = @id_carrera
          AND id_coordinador = @id_coordinador
        ORDER BY id_oferta DESC
      `);

    const oferta = ofertaRes.recordset[0] || null;

    // 7. Grupos de esa oferta (si existe)
    let grupos = [];
    if (oferta) {
      const gruposRes = await pool.request()
        .input('id_oferta', sql.Int, oferta.id_oferta)
        .query(`
          SELECT
            g.id_grupo,
            g.clave,
            g.cupo_max,
            g.cupo_disponible,
            g.estado,
            m.nombre                                   AS materia,
            m.clave                                    AS materia_clave,
            m.creditos,
            ud.nombre                                  AS docente,
            a.numero                                   AS aula_numero,
            a.edificio,
            h.dias,
            CONVERT(VARCHAR(5), h.hora_inicio, 108)    AS hora_inicio,
            CONVERT(VARCHAR(5), h.hora_fin,    108)    AS hora_fin
          FROM grupo g
          JOIN materia  m  ON m.id_materia = g.id_materia
          JOIN docente  d  ON d.id_docente = g.id_docente
          JOIN usuario  ud ON ud.id_usuario = d.id_docente
          JOIN aula     a  ON a.id_aula    = g.id_aula
          JOIN horario  h  ON h.id_horario = g.id_horario
          WHERE g.id_oferta = @id_oferta
          ORDER BY m.nombre, g.clave
        `);

      grupos = gruposRes.recordset.map(r => ({
        id_grupo:        r.id_grupo,
        clave:           r.clave,
        cupo_max:        r.cupo_max,
        cupo_disponible: r.cupo_disponible,
        estado:          r.estado,
        materia:         r.materia,
        materia_clave:   r.materia_clave,
        creditos:        r.creditos,
        docente:         r.docente,
        aula:            `${r.aula_numero} — ${r.edificio}`,
        horario:         `${r.dias} · ${r.hora_inicio}–${r.hora_fin}`
      }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      coordinador: {
        nombre:        coord.nombre,
        carrera:       coord.carrera,
        carrera_clave: coord.carrera_clave,
        id_carrera:    coord.id_carrera
      },
      oferta,
      grupos,
      catalogo: {
        materias:  materiasRes.recordset,
        aulas:     aulasRes.recordset,
        horarios:  horariosRes.recordset,
        docentes:  docentesRes.recordset
      }
    }));

  } catch (err) {
    console.error('Error en getMaterias:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { handle };