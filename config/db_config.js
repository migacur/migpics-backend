const mysql = require("mysql2/promise"); // 👈 Usa directamente la versión con promesas

const db_config = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  idleTimeout: 10000,    // Cierra conexiones inactivas después de 10s
  enableKeepAlive: true,
});

// Verificación de conexión al iniciar (opcional)
async function verificarConexion() {
  let connection;
  try {
    connection = await db_config.getConnection();
    await connection.query("SELECT 1"); // 👈 Consulta de prueba
    console.log("✅ Conexión exitosa a la BBDD");
  } catch (error) {
    console.error("❌ Error al conectar a la BBDD:", error.message);
  } finally {
    if (connection) connection.release(); // 👈 Libera la conexión, no el pool
  }
}

verificarConexion();

module.exports = db_config;