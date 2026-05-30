// =====================================================
//  db.js – Conexión a SQL Server con mssql
// =====================================================

const sql = require('mssql');

const config = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server:   process.env.DB_SERVER,   // Ej: 'localhost' o '.\SQLEXPRESS'
  database: process.env.DB_NAME,
  options: {
    encrypt:                false,   // true si usas Azure
    trustServerCertificate: true     // necesario en SQL Server local
  }
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('Conectado a SQL Server');
  }
  return pool;
}

module.exports = { getPool, sql };