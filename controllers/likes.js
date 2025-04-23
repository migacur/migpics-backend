const { request, response } = require("express");
const db_config = require("../config/db_config");

const darLikePost = async (req, res) => {
    const { postId } = req.params;
    const userId = req.body.data.id;
    let connection;
  
    try {
        if (!postId || !userId) {
            return res.status(400).json({ error: "Datos incompletos" });
        }
  
        connection = await db_config.getConnection();
        await connection.beginTransaction();

        // 1. VERIFICACIÓN DE EXISTENCIA (CORREGIDO)
        const [[userCheck], [[publicacion]]] = await Promise.all([
            connection.query("SELECT 1 FROM usuarios WHERE user_id = ?", [userId]),
            connection.query("SELECT 1 FROM publicaciones WHERE publicacion_id = ?", [postId])
        ]);

        // Verificar resultados correctamente
        if (!userCheck?.length || !publicacion?.length) {
            throw new Error(
                !userCheck?.length 
                ? "Usuario no existe" 
                : "Publicación no existe"
            );
        }

        // 2. VERIFICAR LIKE EXISTENTE
        const [existingLike] = await connection.query(
            `SELECT * FROM likes_publicaciones 
             WHERE publicacion_id = ? AND user_id = ? FOR UPDATE`,
            [postId, userId]
        );
  
        // 3. OPERACIÓN LIKE/UNLIKE
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
  
        // 4. OBTENER CONTADOR ACTUALIZADO
        const [[{ likes: totalLikes }]] = await connection.query(
            `SELECT COUNT(*) AS likes 
             FROM likes_publicaciones 
             WHERE publicacion_id = ?`,
            [postId]
        );
  
        await connection.commit();
  
        res.status(200).json({
            isLiked: !existingLike.length,
            likes: totalLikes
        });
  
    } catch (error) {
        // MANEJO DE ERRORES CORREGIDO (EVITA DOBLE RELEASE)
        if (connection) {
            await connection.rollback();
            connection.release();
            connection = null; // 👈 Marca como liberada
        }

        console.error(`Error en darLikePost [UID:${userId}, Post:${postId}]:`, error);
        console.log('Resultados de verificación:', {
            userCheck: userCheck?.length,
            publicacion: publicacion?.length
        });

        const errorResponse = {
            error: error.message.includes("no existe") 
                ? error.message 
                : "Error al procesar el like",
            ...(process.env.NODE_ENV === "development" && { 
                stack: error.stack 
            })
        };
  
        res.status(
            error.message.includes("no existe") ? 404 : 500
        ).json(errorResponse);
  
    } finally {
        // LIBERACIÓN SEGURA (SOLO SI NO SE LIBERÓ ANTES)
        if (connection && !connection._closed && connection.release) {
            connection.release();
        }
    }
};
module.exports = {
    darLikePost
}