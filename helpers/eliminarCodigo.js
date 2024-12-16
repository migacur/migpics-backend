const db_config = require("../config/db_config");

const eliminarCodigoBBDD = async(userId) => {

    const eliminarCodigo = 'DELETE FROM codigos_usuario WHERE user_id = ?'
  
    await db_config.query(eliminarCodigo, [userId], (error, resultadoBusqueda) => {
      if (error) {
       console.log(error);
        return res.status(500)
              .json({ msg: 'Ocurrió un error al procesar la solicitud' });
      }if(resultadoBusqueda.length === 0){
        return res.status(401).json({msg: 'No se encontraron resultados'})
      }

    });
    
}
 
 module.exports = eliminarCodigoBBDD;

