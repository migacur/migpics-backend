const { request, response } = require("express");
const db_config = require("../config/db_config");

const darLikePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.body.data.id;
  let connection;

  try {
      // Validaciones básicas
      if (!postId || !userId) {
          return res.status(400).json({ error: "Datos incompletos" });
      }

      connection = await db_config.getConnection();
      await connection.beginTransaction(); // Iniciar transacción

      // 1. Verificar existencia de usuario y publicación (opcional)
      const [usuario] = await connection.query(
          "SELECT 1 FROM usuarios WHERE user_id = ?",
          [userId]
      );
      if (usuario.length === 0) throw new Error("Usuario no existe");

      const [publicacion] = await connection.query(
          "SELECT 1 FROM publicaciones WHERE publicacion_id = ?",
          [postId]
      );
      if (publicacion.length === 0) throw new Error("Publicación no existe");

      // 2. Bloquear fila y verificar like existente
      const [likes] = await connection.query(
          `SELECT * FROM likes_publicaciones 
           WHERE publicacion_id = ? AND user_id = ? FOR UPDATE`,
          [postId, userId]
      );

      // 3. Operación de like/unlike
      if (likes.length > 0) {
          await connection.query(
              `DELETE FROM likes_publicaciones 
               WHERE publicacion_id = ? AND user_id = ?`,
              [postId, userId]
          );
      } else {
          await connection.query(
              `INSERT INTO likes_publicaciones (publicacion_id, user_id) 
               VALUES (?, ?)`,
              [postId, userId]
          );
      }

      // 4. Obtener nuevo estado y contador
      const [nuevoEstado] = await connection.query(
          `SELECT COUNT(*) AS likes 
           FROM likes_publicaciones WHERE publicacion_id = ?`,
          [postId]
      );

      await connection.commit(); // Confirmar cambios

      res.status(200).json({
          isLiked: likes.length === 0, // Si había like → ahora no (y viceversa)
          likes: nuevoEstado[0].likes
      });

  } catch (error) {
      if (connection) {
          await connection.rollback(); // Revertir cambios
          connection.release(); // Liberar conexión
      }

      console.error(`Error en darLikePost [UID:${userId}, Post:${postId}]:`, error);

      res.status(500).json({
          error: "Error al procesar el like",
          ...(process.env.NODE_ENV === "development" && { detalle: error.message })
      });
  } finally {
      if (connection) connection.release();
  }
};
module.exports = {
    darLikePost
}