// =====================================================
//  handlers/auth.js – Login unificado por correo
//  POST /api/auth/login
//  Body:    { email, password }
//  Retorna: { rol, id, nombre } o { error }
// =====================================================

const { getPool, sql } = require('../../db');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Correo y contraseña son requeridos.' }));
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('email',    sql.VarChar, email)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT
          u.id_usuario  AS id,
          u.nombre,
          u.tipo,
          a.estado_pago       -- NULL si no es alumno
        FROM usuario u
        LEFT JOIN alumno a ON a.id_alumno = u.id_usuario
        WHERE u.email    = @email
          AND u.password = @password
      `);

    if (result.recordset.length === 0) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Correo o contraseña incorrectos.' }));
    }

    const usuario = result.recordset[0];

    // Regla de negocio: alumno con adeudo no puede ingresar
    if (usuario.tipo === 'alumno' && usuario.estado_pago === 'adeudo') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Tienes un adeudo pendiente. Acude al Departamento de Finanzas.'
      }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      rol:    usuario.tipo,
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
