const db_config = require("../config/db_config");

const actualizarDescargas = async (postId) => {
  try {
      await db_config.query(
          'UPDATE publicaciones SET descargas = descargas + 1 WHERE idPublicacion = ?',
          [postId]
      );
  } catch (error) {
      console.error('Error en actualizarDescargas:', error);
      throw error;
  }
};

 module.exports = actualizarDescargas;