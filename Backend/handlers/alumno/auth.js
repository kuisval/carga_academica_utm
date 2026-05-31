// =====================================================
//  handlers/auth.js – Login unificado
//  POST /api/auth/login
//  Body:    { clave, password }
//  Retorna: { rol, id, nombre } o { error }
// =====================================================

const { getPool, sql } = require('../../db');

async function login(req, res) {
  const { matricula, password } = req.body;   // 'matricula' viene del frontend

  if (!matricula || !password) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Clave y contraseña son requeridas.' }));
  }

  try {
    const pool = await getPool();

    // ── Consulta a la supertabla usuario ──────────────────────
    // Trae el tipo de usuario y, si es alumno, su estado de pago
    const result = await pool.request()
      .input('clave',     sql.VarChar, matricula)
      .input('password',  sql.VarChar, password)
      .query(`
        SELECT
          u.id_usuario  AS id,
          u.nombre,
          u.tipo,
          a.estado_pago           -- NULL si no es alumno
        FROM usuario u
        LEFT JOIN alumno a ON a.id_alumno = u.id_usuario
        WHERE u.clave    = @clave
          AND u.password = @password
      `);

    if (result.recordset.length === 0) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Clave o contraseña incorrectos.' }));
    }

    const usuario = result.recordset[0];

    // ── Regla de negocio: alumno con adeudo no puede ingresar ──
    if (usuario.tipo === 'alumno' && usuario.estado_pago === 'adeudo') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Tienes un adeudo pendiente. Acude al Departamento de Finanzas.'
      }));
    }

    // ── Login exitoso ──────────────────────────────────────────
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      rol:    usuario.tipo,    // 'alumno' | 'coordinador' | 'docente'
      id:     usuario.id,
      nombre: usuario.nombre,
    }));

  } catch (err) {
    console.error('Error en login:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { login };
