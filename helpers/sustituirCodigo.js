const db_config = require("../config/db_config");

function updateCode(code,userId) {
    const query = `UPDATE codigos_usuario SET codigo = ${code} WHERE user_id = ${userId}`;
  
    db_config.query(query, (error, results) => {
      if (error) {
        console.error('Error al sustitur el código del usuario: ', error);
      } else {
        console.log('Se ha modificado el código del usuario');
      }
    });
  }

 module.exports = updateCode;