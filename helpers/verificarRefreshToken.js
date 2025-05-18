const db_config = require("../config/db_config");

async function verificarRefreshTokenEnBD(token) {
  const query = "SELECT * FROM refresh_tokens WHERE token = ?";

  try {
    const [resultados] = await db_config.query(query, [token]);

    // Verificar si hay resultados
    if (!resultados || resultados.length === 0) {
      throw new Error("Token no encontrado");
    }

    if (new Date(resultados[0].expiracion) < new Date()) {
      await db_config.query("DELETE FROM refresh_tokens WHERE token_id = ?", [
        resultados[0].token_id,
      ]);
      throw new Error("Token expirado");
    }

    return resultados[0]; 
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

module.exports = verificarRefreshTokenEnBD;
