const db_config = require("../config/db_config");

function actualizarDescargas(publicacionId) {
    const query = `UPDATE publicaciones SET descargas = descargas + 1 WHERE publicacion_id = ${publicacionId}`;
  
    db_config.query(query, (error, results) => {
      if (error) {
        console.error('Error al actualizar el contador de descargas: ', error);
      } else {
        console.log('Actualizado el contador de descargas');
      }
    });
  }

 module.exports = actualizarDescargas;