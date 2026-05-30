// =====================================================
//  handlers/auth.js – Login
//  POST /api/auth/login
//  Body: { matricula, password }
//  Responde: { rol, id, nombre } o { error }
// =====================================================

const { getPool, sql } = require('../../db');

async function login(req, res) {
  // Leer body (ya parseado por server.js)
  const { matricula, password } = req.body;

  // Validación básica
  if (!matricula || !password) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Matrícula y contraseña son requeridas.' }));
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('matricula', sql.VarChar, matricula)
      .input('password',  sql.VarChar, password)
      .query(`
        SELECT id_alumno, nombre, estado_pago
        FROM   alumno
        WHERE  matricula = @matricula
          AND  password  = @password
      `);

    if (result.recordset.length === 0) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Matrícula o contraseña incorrectos.' }));
    }

    const alumno = result.recordset[0];

    // Verificar estado de pago
    if (alumno.estado_pago === 'adeudo') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Tienes un adeudo pendiente. Acude al Departamento de Finanzas.'
      }));
    }

    // Login exitoso
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      rol:    'alumno',
      id:     alumno.id_alumno,
      nombre: alumno.nombre
    }));

  } catch (err) {
    console.error('Error en login:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Error interno del servidor.' }));
  }
}

module.exports = { login };