const { request, response } = require("express");
const db_config = require("../config/db_config");

const agregarFavoritos = (req = request, res = response) => {
    const { postId } = req.params;
    const userId = req.body.data.id;

    if(!req.payload.id){
      return res.status(401).json({msg: 'No estás autorizado para realizar esta acción'})
    }
  
    const query = 'SELECT * FROM favoritos WHERE idPublicacion = ? AND idUsuario = ?';
  
    db_config.query(query, [postId, userId], (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud' });
      }
      if (results.length > 0) {
        // quitar like
        const query2 = 'DELETE FROM favoritos WHERE idPublicacion = ? AND idUsuario = ?';
  
        db_config.query(query2, [postId, userId], (error, results) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud' });
          }
          return res.status(200).json({ 
            msg: 'Publicación eliminada de tus favoritos', 
            isFavorite: false 
            });
        });
      } else {
        // dar like
        const query3 = 'INSERT INTO favoritos (idPublicacion,idUsuario,fecha_agregado) VALUES (?,?,NOW())';
  
        db_config.query(query3, [postId, userId], (error, results) => {
          if (error) {
            return res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud' });
          }
          return res.status(200).json({ 
            msg: 'Publicación agregada en favoritos', 
            isFavorite: true 
            });
        });
      }
    });
  };
  

module.exports = {
    agregarFavoritos
}