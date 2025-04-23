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
        await connection.beginTransaction();
  
        // 1. Verificar existencia de usuario y publicación (optimizado con Promise.all)
        const [[[usuario]], [[publicacion]]] = await Promise.all([
            connection.query("SELECT 1 FROM usuarios WHERE user_id = ?", [userId]),
            connection.query("SELECT 1 FROM publicaciones WHERE publicacion_id = ?", [postId])
        ]);
  
        if (!usuario || !publicacion.length) {
            throw new Error(usuario ? "Publicación no existe" : "Usuario no existe");
        }
  
        // 2. Bloquear fila y verificar like existente (variable renombrada a existingLike)
        const [existingLike] = await connection.query(
            `SELECT * FROM likes_publicaciones 
             WHERE publicacion_id = ? AND user_id = ? FOR UPDATE`,
            [postId, userId]
        );
  
        // 3. Operación like/unlike con fecha manual (formato MySQL)
        const mysqlDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
        if (existingLike.length > 0) {
            await connection.query(
                `DELETE FROM likes_publicaciones 
                 WHERE publicacion_id = ? AND user_id = ?`,
                [postId, userId]
            );
        } else {
            await connection.query(
                `INSERT INTO likes_publicaciones 
                 (publicacion_id, user_id, fecha_like) 
                 VALUES (?, ?, ?)`,
                [postId, userId, mysqlDateTime]
            );
        }
  
        // 4. Obtener nuevo contador (variable renombrada a totalLikes)
        const [[{ likes: totalLikes }]] = await connection.query(
            `SELECT COUNT(*) AS likes 
             FROM likes_publicaciones 
             WHERE publicacion_id = ?`,
            [postId]
        );
  
        await connection.commit();
  
        res.status(200).json({
            isLiked: !existingLike.length, // Estado inverso al original
            likes: totalLikes
        });
  
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
  
        console.error(`Error en darLikePost [UID:${userId}, Post:${postId}]:`, error);
  
        const errorResponse = {
            error: "Error al procesar el like",
            ...(process.env.NODE_ENV === "development" && { 
                detalle: error.message,
                stack: error.stack 
            })
        };
  
        res.status(500).json(errorResponse);
  
    } finally {
        if (connection && connection.release) connection.release();
    }
  };
module.exports = {
    darLikePost
}