const { request, response } = require("express");
const db_config = require("../config/db_config");

const darLikePost = async (req=request, res=response) => {
    const { postId } = req.params;
    const userId = req.body.data.id;
    let connection;
    let userCheck = [];
    let publicacion = [];

    try {
        if (!postId || !userId) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        connection = await db_config.getConnection();
        await connection.beginTransaction();

        // 1. VERIFICACIÓN CORREGIDA (usa resultados directos)
        const [userResults, publicationResults] = await Promise.all([
            connection.query("SELECT user_id FROM usuarios WHERE user_id = ?", [userId]),
            connection.query("SELECT publicacion_id FROM publicaciones WHERE publicacion_id = ?", [postId])
        ]);

        userCheck = userResults[0];
        publicacion = publicationResults[0];

        if (userCheck.length === 0 || publicacion.length === 0) {
            throw new Error(
                userCheck.length === 0 
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
            msg:existingLike > 0 ? "Ya no te gusta esta publicación" : "Te gustó esta publicación",
            likes: totalLikes
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }

        console.error(`Error en darLikePost [UID:${userId}, Post:${postId}]:`, error);
        console.log('Resultados de verificación:', {
            usuario: userCheck.length,
            publicacion: publicacion.length
        });

        const statusCode = error.message.includes("no existe") ? 404 : 500;
        res.status(statusCode).json({
            error: error.message,
            ...(process.env.NODE_ENV === "development" && { stack: error.stack })
        });

    } finally {
        if (connection && !connection._closed) {
            connection.release();
        }
    }
};

module.exports = {
    darLikePost
};