const { request, response } = require("express");
const db_config = require("../config/db_config");

const showTopPostUsers = async(req=request, res=response) => {

    const query = `SELECT usuarios.user_id AS id, usuarios.username AS usuario, COUNT(publicaciones.idUsuario) AS total_post
    FROM publicaciones
    LEFT JOIN usuarios ON publicaciones.idUsuario = usuarios.user_id
	GROUP BY usuarios.user_id
    ORDER BY total_post DESC LIMIT 10;`;

    try {
        const [results] = await db_config.query(query)
        return res.status(200).json(results)
    } catch (error) {
        console.log(error)
        return res.status(500)
            .json({msg: 'Ocurrió un error al mostrar los datos, vuelva a intentarlo'})
    }

}

const showTopLikeUsers = async(req=request, res=response) => {

    const query = `SELECT usuarios.user_id,usuarios.username, COUNT(likes_publicaciones.like_id) as likes_totales FROM publicaciones
    LEFT JOIN likes_publicaciones
    ON likes_publicaciones.publicacion_id = publicaciones.publicacion_id
    LEFT JOIN usuarios
    ON usuarios.user_id = publicaciones.idUsuario
    GROUP BY usuarios.username
    ORDER BY likes_totales DESC LIMIT 10`;
    
    try {
        const [results] = await db_config.query(query)
        return res.status(200).json(results)
    } catch (error) {
        console.log(error)
        return res.status(500)
            .json({msg: 'Ocurrió un error al mostrar los datos, vuelva a intentarlo'})
    }

}

module.exports = {
    showTopPostUsers,
    showTopLikeUsers
}