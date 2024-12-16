const { request, response } = require("express");
const db_config = require("../config/db_config");

const obtenerTopLikes = async(req=request,res=response) => {
    const query = `SELECT p.publicacion_id, p.titulo, COUNT(l.like_id) AS total_likes
    FROM Publicaciones p
    LEFT JOIN Likes_publicaciones l ON p.publicacion_id = l.publicacion_id
    GROUP BY p.publicacion_id, p.titulo
    ORDER BY total_likes DESC LIMIT 10`;

    db_config.query(query, (err,result) => {
        if(err){
            return res.status(500).json({msg: 'Ocurrió un error al mostrar los datos, vuelva a intentarlo'})
        }
        return res.status(200).json(result)
    })
}

const obtenerTopComentarios = async(req=request,res=response) => {
    const query = `
    SELECT publicaciones.publicacion_id, titulo,COUNT(DISTINCT comentarios.comentario_id) AS total_comentarios, COUNT(respuestas_comentarios.respuesta_id) AS total_respuestas
    FROM publicaciones
        LEFT JOIN comentarios ON publicaciones.publicacion_id = comentarios.publicacion_id
        LEFT JOIN respuestas_comentarios ON respuestas_comentarios.idComentario = comentarios.comentario_id
        GROUP BY publicaciones.publicacion_id, titulo
        ORDER BY total_comentarios+total_respuestas DESC LIMIT 10;
    `;

    db_config.query(query, (err,result) => {
        if(err){
            return res.status(500).json({msg: 'Ocurrió un error al mostrar los datos, vuelva a intentarlo'})
        }
        return res.status(200).json(result)
    })
}

module.exports = {
    obtenerTopLikes,
    obtenerTopComentarios
}