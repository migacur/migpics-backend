const { request, response } = require("express");
const db_config = require("../config/db_config");

const darLikePost = (req = request, res = response) => {
    const { postId } = req.params;
    const userId = req.body.data.id;
  
    const query = 'SELECT * FROM likes_publicaciones WHERE publicacion_id = ? AND user_id = ?';
  
    db_config.query(query, [postId, userId], (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud' });
      }
      if (results.length > 0) {
        // quitar like
        const query2 = 'DELETE FROM likes_publicaciones WHERE publicacion_id = ? AND user_id = ?';
  
        db_config.query(query2, [postId, userId], (error, results) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud' });
          }
          return res.status(200).json({ 
            msg: 'Ya no te gusta esta publicación', 
            isLiked: false 
            });
        });
      } else {
        // dar like
        const query3 = 'INSERT INTO likes_publicaciones (publicacion_id, user_id) VALUES (?, ?)';
  
        db_config.query(query3, [postId, userId], (error, results) => {
          if (error) {
            return res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud' });
          }
          return res.status(200).json({ 
            msg: 'Te ha gustado esta publicación', 
            isLiked: true 
            });
        });
      }
    });
  };
  

module.exports = {
    darLikePost
}