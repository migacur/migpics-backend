const db_config = require("../config/db_config");

function actualizarContadorVisitas(publicacionId) {
    const query = 'UPDATE publicaciones SET visitas = visitas + 1 WHERE publicacion_id = ?';
  
    db_config.query(query,[publicacionId],(error, results) => {
      if (error) {
        console.error('Error al actualizar el contador de visitas: ', error);
      }
    });
  }

 module.exports = actualizarContadorVisitas