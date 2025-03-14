const mysql = require('mysql2');

const db_config = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db_config.getConnection((err, connection) => {
  if (err) {
    console.error('Error al obtener conexión del pool:', err);
    return;
  }
  console.log('Conexión exitosa a la BBDD. ID de conexión:', connection.threadId);
  connection.release(); // Libera la conexión al pool
});

module.exports = db_config;