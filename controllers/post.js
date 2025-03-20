const { request, response } = require("express");
const db_config = require("../config/db_config");
const cloudinary = require("../config/cloudinary");
const fs = require("fs-extra");
const actualizarContadorVisitas = require("../helpers/updateViews");
const eliminarImagenCloudinary = require("../helpers/deleteImage");

const agregarPost = async (req = request, res = response) => {
  const result = await cloudinary.uploader.upload(req.file.path);

  const { titulo, descripcion } = req.body;

  if (!titulo.trim().length || !result) {
    return res
      .status(400)
      .json({ msg: "Comprueba que tu post contenga título e imagen" });
  }

  await fs.unlink(req.file.path);

  const idUsuario = req.params.id;

  try {
    const fechaPublicacion = new Date();
    await db_config.query(
      "INSERT INTO publicaciones SET ?",
      {
        titulo: titulo,
        imagen: result.url,
        descripcion: descripcion,
        idUsuario: idUsuario,
        fecha_publicacion: fechaPublicacion,
      },
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .json({ error: "Ocurrió un error en el servidor" });
        }
        console.log(result.insertId);
        return res.status(200).json({
          msg: "Publicación realizada con éxito",
          idPost: result.insertId,
        });
      }
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ msg: "Ocurrió un error, no se pudo realizar la publicación" });
  }
};

const mostrarPostRecientes = async (req, res) => {
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 20;
  const offset = (pagina - 1) * elementosPorPagina;

  const query = `
    SELECT publicaciones.publicacion_id, publicaciones.imagen,
    COUNT(likes_publicaciones.like_id) as likes_totales, 
    publicaciones.fecha_publicacion 
    FROM publicaciones
    LEFT JOIN likes_publicaciones
    ON publicaciones.publicacion_id = likes_publicaciones.publicacion_id
    GROUP BY publicaciones.publicacion_id
    ORDER BY publicaciones.fecha_publicacion DESC LIMIT ? OFFSET ?;
  `;

  try {
    const [results] = await db_config.query(query, [
      parseInt(elementosPorPagina), 
      offset
    ]);
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const mostrarTendencias = async(req = request, res = response) => {
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 20;
  const offset = (pagina - 1) * elementosPorPagina;

  const query = `
  SELECT p.publicacion_id, p.titulo, p.imagen, p.descripcion, p.visitas,
COALESCE(l.total_likes, 0) AS total_likes,
COALESCE(c.comentarios_totales, 0) AS comentarios_totales,
COALESCE(r.res_totales, 0) AS res_totales,
(p.visitas + COALESCE(l.total_likes, 0) +
COALESCE(c.comentarios_totales, 0) +
COALESCE(r.res_totales, 0)) / 4 AS promedio_total
FROM publicaciones p
LEFT JOIN (
SELECT publicacion_id, COUNT(like_id) AS total_likes
FROM likes_publicaciones
GROUP BY publicacion_id
) l ON l.publicacion_id = p.publicacion_id
LEFT JOIN (
SELECT publicacion_id, COUNT(comentario_id) AS comentarios_totales
FROM comentarios
GROUP BY publicacion_id
) c ON c.publicacion_id = p.publicacion_id
LEFT JOIN (
SELECT comentarios.publicacion_id, COUNT(respuestas_comentarios.respuesta_id) AS res_totales
FROM comentarios
LEFT JOIN respuestas_comentarios ON respuestas_comentarios.idComentario = comentarios.comentario_id
GROUP BY comentarios.publicacion_id
) r ON r.publicacion_id = p.publicacion_id
ORDER BY promedio_total DESC
LIMIT ? OFFSET ?
  `;

  try {
    const [results] = await db_config.query(query, [
      parseInt(elementosPorPagina), 
      offset
    ]);
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }

};

const mostrarPostPorId = async (req, res) => {
  const postId = req.params.postId;
  
  try {
    if (!req.payload) {
      return res.status(401).json({ 
        msg: "Tienes que ingresar para ver la publicación" 
      });
    }

    if (!postId) {
      return res.status(400).json({ 
        msg: "Error al mostrar la publicación" 
      });
    }

    const query = `
      SELECT 
        p.*,
        u.username AS creador_username,
        u.avatar AS creador_avatar,
        COUNT(lp.publicacion_id) AS likes_count,
        COUNT(DISTINCT f.favorito_id) as contador_favoritos,
        p.descargas,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.publicacion_id) AS comentarios_count,
        (SELECT COUNT(*) FROM respuestas_comentarios rc 
          JOIN comentarios c ON rc.idComentario = c.comentario_id 
          WHERE c.publicacion_id = p.publicacion_id) AS respuestas_count,
        (CASE WHEN FIND_IN_SET(?, GROUP_CONCAT(lp.user_id)) > 0 THEN true ELSE false END) AS verificacion_usuario,
        (CASE WHEN EXISTS (SELECT * FROM favoritos f 
          WHERE f.idPublicacion = p.publicacion_id 
          AND f.idUsuario = ?) THEN true ELSE false END) AS verificacion_favorito
      FROM 
        publicaciones p
        LEFT JOIN likes_publicaciones lp ON p.publicacion_id = lp.publicacion_id
        LEFT JOIN favoritos f ON f.idPublicacion = p.publicacion_id
        JOIN usuarios u ON p.idUsuario = u.user_id
      WHERE 
        p.publicacion_id = ?
      GROUP BY 
        p.publicacion_id, u.username, f.favorito_id
    `;

    const [results] = await db_config.query(query, [
      req.payload.id, 
      req.payload.id, 
      postId
    ]);

    if (!results || results.length === 0) {
      return res.status(404).json({
        msg: "No existe la publicación que intentas ver",
        redirect: `${process.env.FRONTEND_URL}/`
      });
    }

    await actualizarContadorVisitas(postId); 

    res.status(200).json(results[0]);

  } catch (err) {
    console.error('Error en mostrarPostPorId:', err);

    const errorResponse = {
      msg: "Ocurrió un error en el servidor",
      redirect: `${process.env.FRONTEND_URL}/`
    };

    if (err.code === 'ER_PARSE_ERROR') {
      errorResponse.msg = "Error en la consulta a la base de datos";
    }

    res.status(500).json(errorResponse);
  }
};

const mostrarComentariosPost = async (req = request, res = response) => {
  const { postId } = req.params;

  const query = `SELECT c.comentario_id, c.texto AS comentario, u.username, u.avatar, c.user_id AS idUser, c.publicacion_id, 
GROUP_CONCAT(r.respuesta_id SEPARATOR '|||') AS respuesta_ids, 
GROUP_CONCAT(r.contenido SEPARATOR '|||') AS respuestas, 
GROUP_CONCAT(u_respuesta.username SEPARATOR '|||') AS usernames_respuesta
FROM comentarios c
JOIN usuarios u ON c.user_id = u.user_id
LEFT JOIN respuestas_comentarios r ON c.comentario_id = r.idComentario
LEFT JOIN usuarios u_respuesta ON r.idUser = u_respuesta.user_id
WHERE c.publicacion_id = ?
GROUP BY c.comentario_id, c.texto, u.username, c.user_id, c.publicacion_id
ORDER BY c.fecha_creado DESC;
`;

try {
  const [results] =  await db_config.query(query, [postId]);
  return res.status(200).json(results);
} catch (error) {
  return res.status(500).json({msg:"Ha ocurrido un error al mostrar los comentarios"});
}

};

const mostrarRespuestasComentario = async(req = request, res = response) => {
  const { comentarioId } = req.params;

  const query = `
  SELECT DISTINCT respuestas_comentarios.*, usuarios.username, usuarios.avatar
FROM respuestas_comentarios
LEFT JOIN usuarios ON respuestas_comentarios.idUser = usuarios.user_id
LEFT JOIN comentarios ON usuarios.user_id = comentarios.user_id
WHERE respuestas_comentarios.idComentario = ?
ORDER BY fecha_creado DESC;

  `;


try {
  const [results] = await db_config.query(query, [comentarioId]);
  return res.status(200).json(results);
} catch (error) {
  return res.status(500).json({msg:"Ha ocurrido un error al realizar esta solicitud"});
}
};

const borrarRespuestasComentario = async(req = request, res = response) => {
  const { id } = req.params;

  const query = "DELETE FROM respuestas_comentarios WHERE respuesta_id = ?";
try {
  await db_config.query(query, [id])
  return res.status(200).json({ msg: "Respuesta eliminada exitosamente" });
} catch (error) {
  return res.status(500).json({ msg: "Ocurrió un error al eliminar la respuesta" });
}
  
};

const agregarComentario = async (req = request, res = response) => {
  try {
    const { postId } = req.params;
    const userId = req.body.id;
    const comentario = req.body.comentario;
  
    const query =
      "INSERT INTO comentarios (texto, publicacion_id, user_id, fecha_creado) VALUES (?, ?, ?, NOW())";

  await db_config.query(query, [comentario, postId, userId])
  return res.status(200).json({ msg: "Su comentario fue publicado" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ msg: "Ha ocurrido un error al procesar su solicitud" });
  }
};

const eliminarComentario = async (req = request, res = response) => {
  const { id } = req.params;

  const query = "DELETE FROM comentarios WHERE comentario_id = ?";

  try {
    await db_config.query(query, [id]);
    return res
    .status(200)
    .json({ msg: "Tu comentario fue eliminado exitosamente" });
  } catch (error) {
    return res
        .status(500)
        .json({ msg: "Ocurrió un error al mostrar los comentarios" });
  }

};

const buscarPost = async (req = request, res = response) => {
  const { palabra } = req.params;
 
  try {
    if(palabra.trim().length < 3 || palabra.trim().length > 10){
      return res.status(400).json({msg:"Sólo se permite ingresar entre 3 y 10 caracteres"})
    }
  
    const query = `
    SELECT publicaciones.*, COUNT(likes_publicaciones.publicacion_id) as total_likes
  FROM publicaciones 
  LEFT JOIN likes_publicaciones ON publicaciones.publicacion_id = likes_publicaciones.publicacion_id 
  WHERE titulo LIKE ?
  GROUP BY publicaciones.publicacion_id
  ORDER BY publicaciones.fecha_publicacion DESC
    `;
    const value = [`%${palabra}%`];

    const [results] = await db_config.query(query, value);
    return res.status(200).json(results);
  } catch (error) {
      console.log(error)
      return res.status(500).json({msg:"Ha ocurrido un error en el servidor"})
  }

  
};

const mostrarPostUsusario = async (req = request, res = response) => {
  const { username } = req.params;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 2;
  const offset = (pagina - 1) * elementosPorPagina;

  const query = `
  SELECT publicaciones.publicacion_id, publicaciones.imagen,publicaciones.fecha_publicacion, 
  usuarios.username, COUNT(likes_publicaciones.like_id) as likes_totales FROM publicaciones
  LEFT JOIN usuarios
  ON publicaciones.idUsuario = usuarios.user_id
  LEFT JOIN likes_publicaciones
  ON likes_publicaciones.publicacion_id = publicaciones.publicacion_id
  WHERE usuarios.username = ? OR usuarios.user_id = ?
  GROUP BY publicaciones.publicacion_id
  ORDER BY publicaciones.fecha_publicacion DESC
  LIMIT ? OFFSET ?
  `;

  try {
    const [results] = await db_config
          .query(query,[username, username, parseInt(elementosPorPagina), offset]);
    return res.status(200).json(results);
  } catch (error) {
    console.log(error)
    return res.status(500).json({msg:"Ha ocurrido un error en el servidor"})
  }
};

const mostrarComentariosUsuario = async (req = request, res = response) => {
  const { username } = req.params;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 10;
  const offset = (pagina - 1) * elementosPorPagina;

  if (!req.payload) {
    return res.status(401).json({ msg: "Usuario no autorizado" });
  }

  if (username !== req.payload.username) {
    return res.status(401).json({ msg: "No puedes ver los comentarios de este usuario" });
  }

  const query1 = `
    SELECT comentarios.*, usuarios.username, publicaciones.titulo
    FROM comentarios
    JOIN usuarios ON comentarios.user_id = usuarios.user_id
    JOIN publicaciones ON comentarios.publicacion_id = publicaciones.publicacion_id
    WHERE usuarios.username = ?
    ORDER BY comentarios.fecha_creado DESC
    LIMIT ? OFFSET ?
  `;

  const query2 = `SELECT respuestas_comentarios.*, usuarios.username AS username_respuesta, usuarios.avatar, u_comentario.username AS comentario_de, 
  comentarios.publicacion_id,publicaciones.titulo
  FROM respuestas_comentarios
  JOIN usuarios ON respuestas_comentarios.idUser = usuarios.user_id
  JOIN comentarios ON comentarios.comentario_id = respuestas_comentarios.idComentario
  JOIN usuarios u_comentario ON comentarios.user_id = u_comentario.user_id
  JOIN publicaciones ON comentarios.publicacion_id = publicaciones.publicacion_id
  WHERE respuestas_comentarios.idUser = ?
  ORDER BY respuestas_comentarios.fecha_creado DESC
  LIMIT ? OFFSET ?
  `;

  db_config.query(
    query1,
    [username, parseInt(elementosPorPagina), offset],
    (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ msg: "Ha ocurrido un error al realizar la búsqueda" });
      }

      const comentarios = result;

      db_config.query(
        query2,
        [req.payload.id, parseInt(elementosPorPagina), offset],
        (err, result) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .json({ msg: "Ha ocurrido un error al obtener las respuestas" });
          }

          const respuestas = result;

          res.status(200).json({ comentarios, respuestas });
        }
      );
    }
  );
};

const eliminarPublicacion = (req, res) => {
  const imagenUrl = req.body.imagenId;
  const { postId } = req.params;
  const userId = req.payload.id;
  const usuarioId = req.body.usuarioId;

  if (!userId || userId !== usuarioId) {
    return res
      .status(401)
      .json({ msg: "No estás autorizado para eliminar esta publicación" });
  }

  try {
    const query =
      "DELETE FROM publicaciones WHERE publicacion_id = ? AND idUsuario = ?";

    db_config.query(query, [postId, userId], (error, results) => {
      if (error) {
        return res
          .status(400)
          .json({ msg: "Ocurrió un error al realizar esta acción" });
      }
      eliminarImagenCloudinary(imagenUrl);
      return res
        .status(200)
        .json({ msg: "La publicación fue eliminada exitosamente" });
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ msg: "Ha ocurrido un error, contacte con el administrador" });
  }
};

const editarPublicacion = (req = request, res = response) => {
  const { titulo, descripcion } = req.body.data;
  const { postId } = req.params;
  const { id } = req.payload;
  const usuarioId = req.body.usuarioId;

  if (!id || id !== usuarioId) {
    return res
      .status(401)
      .json({ msg: "No estás autorizado para realizar esta acción" });
  }

  const query = `UPDATE publicaciones SET 
                   titulo = ?, 
                   descripcion = ?
                   WHERE publicacion_id = ? 
                   AND idUsuario = ?`;

  db_config.query(query, [titulo, descripcion, postId, id], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({
        msg: "Error al editar la publicación",
      });
    } else {
      console.log(result);
      res.status(200).json({
        msg: "Se ha editado la publicación exitosamente...redireccionando",
      });
    }
  });
};

const enviarRepuestaComentario = (req = request, res = response) => {
  const idComentario = req.body.infoRespuesta[0].comentarioId;
  const idUser = req.body.infoRespuesta[0].idUser;
  const contenido = req.body.respuesta;

  const query = `INSERT INTO respuestas_comentarios
  (idComentario,idUser,contenido,fecha_creado) VALUES (?,?,?,NOW())
  `;

  db_config.query(query, [idComentario, idUser, contenido], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ msg: "Ocurrió un error, no se pudo publicar su respuesta" });
    }
    return res.status(200).json({
      msg: "Su respuesta fue publicada",
    });
  });
};

const mostrarListadoLikes = async (req = request, res = response) => {
  const { postId } = req.params;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 2;
  const offset = (pagina - 1) * elementosPorPagina;

  const query = `
  SELECT usuarios.avatar,usuarios.username,likes_publicaciones.like_id FROM usuarios
LEFT JOIN likes_publicaciones
ON usuarios.user_id = likes_publicaciones.user_id
LEFT JOIN publicaciones
ON publicaciones.publicacion_id = likes_publicaciones.publicacion_id
WHERE publicaciones.publicacion_id = ?
ORDER BY likes_publicaciones.fecha_like DESC
LIMIT ? OFFSET ?;

  `;

  db_config.query(
    query,
    [postId, parseInt(elementosPorPagina), offset],
    (err, results) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({
            msg: "Ocurrió un error al mostrar los me gusta de esta publicación",
          });
      }
      res.status(200).json(results);
    }
  );
};

module.exports = {
  agregarPost,
  mostrarPostRecientes,
  mostrarTendencias,
  mostrarPostPorId,
  mostrarComentariosPost,
  agregarComentario,
  mostrarRespuestasComentario,
  borrarRespuestasComentario,
  eliminarComentario,
  buscarPost,
  mostrarPostUsusario,
  mostrarComentariosUsuario,
  eliminarPublicacion,
  editarPublicacion,
  enviarRepuestaComentario,
  mostrarListadoLikes,
};
