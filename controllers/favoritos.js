const { request, response } = require("express");
const db_config = require("../config/db_config");

const agregarFavoritos = async (req = request, res = response) => {
  const postId = parseInt(req.params.postId);
  const userId = req.body.data.id;
  console.log("-----------")
  console.log(req.params)
console.log("-----------")
console.log(req.params.postId)
console.log("-----------")
console.log(req.params.postId[0])
console.log("-----------")

  // Validaciones iniciales
  if (!req.payload.id) {
      return res.status(401).json({ msg: 'No autorizado' });
  }

  if(!postId || !userId){
    return res.status(400)
            .json({ msg: 'No se pudo realizar esta acción por falta de datos' });
  }

  const connection = await db_config.getConnection();
  await connection.beginTransaction();

  try {
      // Verificar si el post existe
      const [post] = await connection.query(
          'SELECT idPublicacion FROM publicaciones WHERE idPublicacion = ?',
          [postId]
      );

      if (post.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ msg: 'Publicación no encontrada' });
      }

      // Verificar si ya está en favoritos
      const [favorito] = await connection.query(
          'SELECT * FROM favoritos WHERE idPublicacion = ? AND idUsuario = ?',
          [postId, userId]
      );

      let isFavorite;
      if (favorito.length > 0) {
          // Eliminar de favoritos
          await connection.query(
              'DELETE FROM favoritos WHERE idPublicacion = ? AND idUsuario = ?',
              [postId, userId]
          );
          isFavorite = false;
      } else {
          // Agregar a favoritos
          await connection.query(
              'INSERT INTO favoritos (idPublicacion, idUsuario, fecha_agregado) VALUES (?, ?, NOW())',
              [postId, userId]
          );
          isFavorite = true;
      }

      await connection.commit();
      connection.release();

      res.status(200).json({
          msg: isFavorite 
              ? 'Publicación agregada a favoritos' 
              : 'Publicación eliminada de favoritos',
          isFavorite
      });

  } catch (error) {
      await connection.rollback();
      connection.release();
      console.error(error);
      res.status(500).json({ msg: 'Error al procesar la solicitud' });
  }
};
  

module.exports = {
    agregarFavoritos
}