const db_config = require("../config/db_config");

function actualizarMensajesLeidos(usuarioId) {
    const query = 'UPDATE mensajes SET leido = 1 WHERE mensajes.user_recibe = ?';
  
    db_config.query(query,[usuarioId],(error, results) => {
      if (error) {
        console.error('Error al actualizar los mensajes leidos', error);
      } else {
        console.log('Actualizado el contador de descargas');
      }
    });
  }

 module.exports = actualizarMensajesLeidos;