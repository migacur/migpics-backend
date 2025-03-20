const db_config = require("../config/db_config");

async function actualizarContadorVisitas(publicacionId) {
  const query = 'UPDATE publicaciones SET visitas = visitas + 1 WHERE publicacion_id = ?';
  try {
    await db_config.query(query, [publicacionId]);
  } catch (error) {
    console.error('Error al actualizar el contador de visitas:', error);
    throw error;
  }
}

module.exports = actualizarContadorVisitas;