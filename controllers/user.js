const { request, response } = require("express");
const jwt = require('jsonwebtoken');
const fs = require("fs-extra");
const db_config = require("../config/db_config");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");
const generarToken = require("../helpers/GenerarToken");
const eliminarImagenCloudinary = require("../helpers/deleteImage");
const generarCodigo = require("../helpers/generarCodigo");
const sendEmailCode = require("../helpers/sendEmail");
const eliminarCodigoBBDD = require("../helpers/eliminarCodigo");
const { validationResult } = require("express-validator");
const updateCode = require("../helpers/sustituirCodigo");

const crearUsuario = async (req = request, res = response) => {
  const { username, password, repeat, email } = req.body;
  const avatar = "https://i.postimg.cc/0Nq25498/avatar.png";
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (password !== repeat) {
      return res.status(400).json({
        msg: "Las contraseñas no coinciden",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = {
      username,
      avatar,
      password: hashPassword,
      email,
    };

    db_config.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username],
      (error, results) => {
        if (error) {
          console.error("Error al buscar el usuario: ", error);
          return res.status(500).json({ msg: "Error al registrar el usuario" });
        }

        if (results.length > 0) {
          return res
            .status(400)
            .json({ msg: "Ya existe un usuario registrado con ese nombre" });
        }

        db_config.query(
          "SELECT * FROM usuarios WHERE email = ?",
          [email],
          (error, results) => {
            if (error) {
              console.error("Error al buscar el usuario: ", error);
              return res
                .status(500)
                .json({ msg: "Error al registrar el usuario" });
            }

            if (results.length > 0) {
              return res.status(400).json({
                msg: "El correo electrónico ya se encuentra registrado",
              });
            }

            db_config.query(
              "INSERT INTO usuarios SET ?",
              nuevoUsuario,
              (error, results) => {
                if (error) {
                  console.error("Error al insertar el usuario: ", error);
                  return res
                    .status(500)
                    .json({ msg: "Error al registrar el usuario" });
                }

                res
                  .status(200)
                  .json({ msg: "Usuario registrado correctamente" });
              }
            );
          }
        );
      }
    );
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      msg: "Hubo un error, contacte con el administrador de la web",
    });
  }
};

const ingresarUsuario = async (req = request, res = response) => {
  const { username, password } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    db_config.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username],
      async (error, results) => {
        if (error) {
          console.log(error);
          return res
            .status(500)
            .json({ msg: "Ocurrió un error, usuario no encontrado" });
        }

        const storedPassword = results[0]?.password;

        if (
          results.length === 0 ||
          !(await bcrypt.compare(password, storedPassword))
        ) {
          return res
            .status(400)
            .json({ msg: "Usuario y/o contraseña incorrectos" });
        }

        const token = generarToken(results[0]);
        const usuario = {
          id: results[0].user_id,
          username: results[0].username,
        };

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        const query = `INSERT INTO refresh_tokens (token, user_id, expiracion) VALUES (?, ?, ?)`;
        db_config.query(
          query,
          [token.refreshToken, results[0].user_id, expiryDate],
          (err) => {
            if (err) {
              console.error("Error al insertar token:", err);
              return res
                .status(500)
                .json({ msg: "Error interno del servidor" });
            }

            res.cookie("access_token", token.accessToken, {
              httpOnly: true,
              sameSite: "Strict",
              secure: true,
            });

            res.cookie("refresh_token", token.refreshToken, {
              httpOnly: true,
              sameSite: "Strict",
              secure: true,
            });

            return res.status(200).json({
              user: usuario,
            });
          }
        );
      }
    );
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      msg: "Hubo un error, contacte con el administrador de la web",
    });
  }
};

const cerrarSesion = (req = request, res = response) => {
  try {
    const usuarioId = req.body.userId
    if(!usuarioId){
      return res.status(400).json({msg: "No se pudo realizar esta solicitud"})
    }
    const query = `DELETE FROM refresh_tokens WHERE user_id = ?`;
    db_config.query(query, [usuarioId], (err) => {
      if (err) throw err;
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      res.status(200).json({ msg: "Cierre de sesión exitoso" });
    });
  } catch (error) {
    res.status(500).json({ msg: "Ha ocurrido un error en el servidor" });
  }
};

const cambiarAvatar = async (req = request, res = response) => {
  const { id } = req.params;

  const archivo = await cloudinary.uploader.upload(req.file.path);

  const query = "SELECT * FROM usuarios where user_id = ?";

  db_config.query(query, [id], async (error, results) => {
    if (error) {
      console.log(error);
      return res
        .status(500)
        .json({ msg: "Ocurrió un error en la búsqueda del usuario" });
    }
    if (results.length > 0) {
      await eliminarImagenCloudinary(results[0].avatar);
      const avatarNuevo = archivo.url;
      // Editar usuario
      const queryUpdate = `UPDATE usuarios SET 
          avatar = ?
          WHERE user_id = ?`;

      db_config.query(
        queryUpdate,
        [avatarNuevo, id],
        async (error, results) => {
          if (error) {
            console.log(error);
            return res
              .status(500)
              .json({ msg: "Ocurrió un error en la búsqueda del usuario" });
          }
        }
      );
    }
  });

  await fs.unlink(req.file.path);
  return res.status(200).json({
    msg: "Has cambiado tu avatar exitosamente, en breve se realizarán los cambios",
  });
};

const mostrarPerfilPublico = async (req = request, res = response) => {
  const { username } = req.params;
  const userLogueado = req.payload.id;
console.log(req.payload.username.toLowerCase(),username)
  if (!userLogueado) {
    return res
      .status(401)
      .json({ msg: "Ingresa/Regístrate para ver este perfil" });
  }

  if(req.payload.username.toLowerCase() === username){
    return res.redirect(`${process.env.FRONTEND_URL}/mi-cuenta`)
  }

  const queryUser = `
  SELECT 
  usuarios.user_id, 
  usuarios.username, 
  usuarios.avatar, 
  usuarios.idRol, 
  usuarios.bio, 
  COUNT(DISTINCT publicaciones.publicacion_id) AS cantidad_publicaciones, 
  COUNT(DISTINCT likes_publicaciones.like_id) AS cantidad_likes,
  COUNT(DISTINCT seguidores.seguidor_id) AS cantidad_seguidores,
  COUNT(DISTINCT seguidos.seguido_id) AS cantidad_seguidos,
  (SELECT COUNT(*) FROM seguidores WHERE seguidores.seguidor_id = ? AND seguidores.followed_id = usuarios.user_id) AS lo_sigue
FROM 
  usuarios
LEFT JOIN 
  publicaciones ON usuarios.user_id = publicaciones.idUsuario
LEFT JOIN 
  likes_publicaciones ON likes_publicaciones.publicacion_id = publicaciones.publicacion_id
LEFT JOIN 
  seguidores ON seguidores.followed_id = usuarios.user_id
LEFT JOIN 
  seguidos ON seguidos.userId = usuarios.user_id
WHERE 
  usuarios.username = ? OR usuarios.user_id = ?
GROUP BY 
  usuarios.user_id, 
  usuarios.username, 
  usuarios.avatar, 
  usuarios.idRol, 
  usuarios.bio, 
  lo_sigue;
  `;

  db_config.query(
    queryUser,
    [userLogueado, username, username],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al acceder a este enlace" });
      }
      console.log(results);
      if (!results.length) {
        return res
          .status(500)
          .json({ msg: `El usuario ${username} no existe` });
      }

      return res.status(200).json(results[0]);
    }
  );
};

const mostrarPerfilPrivado = async (req = request, res = response) => {
  const { userId } = req.params;
  const userLogin = req.payload.id;

  if (!userLogin) {
    return res
      .status(401)
      .json({ msg: "No tienes autorización para ingresar a este enlace" });
  }

  if (Number(userId) !== userLogin) {
    return res
      .status(401)
      .json({ msg: "No tienes autorización para ingresar a este enlace" });
  }

  const query = `
  SELECT 
  usuarios.user_id, 
  username, 
  avatar,
  email,
  bio,
  idRol, 
  COUNT(DISTINCT publicaciones.publicacion_id) AS publicaciones_total, 
  COUNT(DISTINCT comentarios.comentario_id) AS comentarios_total, 
  (SELECT COUNT(*) FROM favoritos WHERE favoritos.idUsuario = usuarios.user_id) AS total_favoritos,
  COUNT(DISTINCT seguidores.seguidor_id) AS cantidad_seguidores,
  COUNT(DISTINCT seguidos.seguido_id) AS cantidad_seguidos,
COUNT(DISTINCT likes_publicaciones.like_id) AS num_likes,
COUNT(DISTINCT respuestas_comentarios.respuesta_id) AS num_respuestas
FROM 
  usuarios
LEFT JOIN 
  publicaciones ON usuarios.user_id = publicaciones.idUsuario
LEFT JOIN 
  comentarios ON usuarios.user_id = comentarios.user_id
LEFT JOIN 
  seguidores ON seguidores.followed_id = usuarios.user_id
LEFT JOIN 
  seguidos ON seguidos.userId = usuarios.user_id
LEFT JOIN 
  likes_publicaciones ON likes_publicaciones.publicacion_id = publicaciones.publicacion_id
LEFT JOIN
respuestas_comentarios ON respuestas_comentarios.idUser = usuarios.user_id
WHERE 
  usuarios.user_id = ?
GROUP BY 
  usuarios.user_id;

  `;

  db_config.query(query, [userLogin], (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ msg: "Ocurrió un error al ingresar a esta ruta" });
    }
    return res.status(200).json(results[0]);
  });
};

const mostrarPublicacionesFavoritas = async (req = request, res = response) => {
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 20;
  const offset = (pagina - 1) * elementosPorPagina;
  const userId = req.payload.id;
  const username = req.payload.username;

  if (!userId) {
    return res
      .status(401)
      .json({ msg: "No tienes autorización para ingresar a este enlace" });
  }

  if (req.params.username !== username) {
    return res
      .status(401)
      .json({ msg: "NO puedes ver los favoritos de este usuario" });
  }

  const query = `
  SELECT favoritos.favorito_id,favoritos.fecha_agregado,publicaciones.publicacion_id,publicaciones.imagen,usuarios.user_id,usuarios.username, COUNT(likes_publicaciones.like_id) as likes_totales FROM favoritos
LEFT JOIN publicaciones
ON favoritos.idPublicacion = publicaciones.publicacion_id
LEFT JOIN usuarios
ON favoritos.idUsuario = usuarios.user_id
LEFT JOIN likes_publicaciones
ON likes_publicaciones.publicacion_id = publicaciones.publicacion_id
WHERE favoritos.idUsuario = ?
GROUP BY publicaciones.publicacion_id
ORDER BY favoritos.fecha_agregado DESC
LIMIT ? OFFSET ?;
  `;

  db_config.query(
    query,
    [userId, parseInt(elementosPorPagina), offset],
    (error, results) => {
      console.log(results.username);
      if (error) {
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al mostrar la data" });
      }
      return res.status(200).json(results);
    }
  );
};

const seguirUsuario = async (req = request, res = response) => {
  const seguidorId = req.payload.id;
  const { userId } = req.params;

  try {
    if (seguidorId === parseInt(userId)) {
      return res.status(400).json({ msg: "No puedes seguirte a ti mismo" });
    }

    // Verificar si ya existe una combinación de seguidorId y userId en la base de datos
    const query =
      "SELECT COUNT(*) AS count FROM seguidores WHERE seguidor_id = ? AND followed_id = ?";
    const result = await db_config.query(query, [seguidorId, userId]);
    const count = result[0]?.count || 0;

    if (count > 0) {
      return res.status(400).json({ msg: "Ya sigues a este usuario" });
    }

    const query1 =
      "INSERT INTO seguidores(seguidor_id, followed_id, fecha) VALUES (?, ?, NOW())";
    const query2 =
      "INSERT INTO seguidos(userId, seguido_id, fecha) VALUES (?, ?, NOW())";

    await db_config.query(query1, [seguidorId, userId]);
    await db_config.query(query2, [seguidorId, userId]);

    // Emitir evento de notificación al usuario seguido
    //io.to(userId).emit('nuevaNotificacion', '¡Te están siguiendo!');

    return res.status(200).json({
      msg: "Ahora sigues a este usuario",
      isFollow: true,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ msg: "Ha ocurrido un error al seguir a este usuario" });
  }
};

const dejarSeguirUsuario = async (req = request, res = response) => {
  const { userId } = req.params;
  const seguidorId = req.payload.id;

  if (seguidorId === parseInt(userId)) {
    return res.status(400).json({ msg: "No puedes seguirte a ti mismo" });
  }

  const query1 =
    "DELETE FROM seguidores WHERE seguidor_id = ? AND followed_id = ?";
  const query2 = "DELETE FROM seguidos WHERE userId = ? AND seguido_id = ?";

  db_config.query(query1, [seguidorId, userId], (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ msg: "Ocurrió un error al realizar esta acción" });
    }
    db_config.query(query2, [seguidorId, userId], (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al realizar esta acción" });
      }
      return res
        .status(200)
        .json({ msg: "Ya no sigues a este usuario", isFollow: false });
    });
  });
};

const modificarBio = async (req = request, res = response) => {
  const { userId } = req.params;
  const { data } = req.body;
  const userToken = req.payload.id;

  if (Number(userId) !== userToken) {
    return res
      .status(401)
      .json({ msg: "No tienes autorización para realizar esta acción" });
  }

  if(data.trim().length < 5 || data.trim().length  > 150){
    return res.status(400).json({msg: "La biografía debe tener un mínimo de 5 caracteres y un máximo de 150"})
  }

  const query = `UPDATE usuarios SET 
  bio = ?
  WHERE user_id = ? 
  `;

  db_config.query(query, [data, userId], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({
        msg: "Error al realizar esta acción",
      });
    } else {
      res.status(200).json({
        msg: "Se ha editado exitosamente su biografía",
      });
    }
  });
};

const mostrarPostSeguidos = async (req = request, res = response) => {
  const { userId } = req.params;
  const userToken = req.payload.id;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 20;
  const offset = (pagina - 1) * elementosPorPagina;

  if (!userToken) {
    return res
      .status(401)
      .json({ msg: "No tienes autorización para realizar esta acción" });
  }

  const query = `
  SELECT publicaciones.publicacion_id,publicaciones.imagen,publicaciones.idUsuario,usuarios.user_id,usuarios.username,seguidos.*,
  COUNT(likes_publicaciones.like_id) as likes_totales
  FROM publicaciones
  LEFT JOIN usuarios
  ON publicaciones.idUsuario = usuarios.user_id
  LEFT JOIN seguidos
  ON publicaciones.idUsuario = seguidos.seguido_id
  LEFT JOIN likes_publicaciones
  ON publicaciones.publicacion_id = likes_publicaciones.publicacion_id
  WHERE seguidos.userId = ?
  GROUP BY publicaciones.publicacion_id
  ORDER BY publicaciones.fecha_publicacion DESC
  LIMIT ? OFFSET ?
  `;

  db_config.query(
    query,
    [userToken, parseInt(elementosPorPagina), offset],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al mostrar las publicaciones" });
      }
      return res.status(200).json(results);
    }
  );
};

const showListadoFollowers = async (req = request, res = response) => {
  const { userId } = req.params;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 2;
  const offset = (pagina - 1) * elementosPorPagina;

  const query = `
  SELECT usuarios.username,usuarios.avatar,seguidores.* FROM usuarios
LEFT JOIN seguidores
ON usuarios.user_id = seguidores.seguidor_id
WHERE seguidores.followed_id= ?
ORDER BY fecha DESC
LIMIT ? OFFSET ?;
  `;

  db_config.query(
    query,
    [userId, parseInt(elementosPorPagina), offset],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al mostrar las publicaciones" });
      }
      return res.status(200).json(results);
    }
  );
};

const showListadoFollowing = async (req = request, res = response) => {
  const { userId } = req.params;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 2;
  const offset = (pagina - 1) * elementosPorPagina;

  const query = `SELECT seguidores.*,
                 usuarios.user_id,usuarios.username,usuarios.avatar FROM seguidores
                 LEFT JOIN usuarios
                 ON seguidores.followed_id = usuarios.user_id
                 WHERE seguidores.seguidor_id = ?
                 ORDER BY fecha DESC
                 LIMIT ? OFFSET ?`;

  db_config.query(
    query,
    [userId, parseInt(elementosPorPagina), offset],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al mostrar las publicaciones" });
      }
      return res.status(200).json(results);
    }
  );
};

const recuperarPassword = async (req = request, res = response) => {

  const { email } = req.body;
  try {

    if(!email){
      return res.status(400).json({msg:"Introduce un email válido y registrado en la web"})
    }

    const existeEmail =
    "SELECT usuarios.user_id,usuarios.username,usuarios.email FROM usuarios WHERE email = ?";

  db_config.query(existeEmail, [email], (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ msg: "Ocurrió un error al realizar esta acción" });
    }if(results.length === 0){
      return res.status(401)
        .json({msg:"El email ingresado es inválido o no se encuentra registrado"})
    }
      const idUsuario = results[0].user_id;
      const usuarioEncontrado = results[0];
      const code = generarCodigo(8);
      
      const insertCode =
        "INSERT INTO codigos_usuario (user_id,codigo,fecha_creado) VALUES (?, ?, NOW())";

      db_config.query(insertCode, [idUsuario, code], (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ msg: "Ocurrió un error al procesar la solicitud" });
        }if(results.length > 0){
          updateCode(idUsuario,code)
        }
        setTimeout(() => eliminarCodigoBBDD(idUsuario), 5 * 60 * 1000);
        sendEmailCode(usuarioEncontrado, code);
        return res
          .status(200)
          .json({ msg: "El código fue enviado exitosamente" });
      });
    
  });
  } catch (error) {
    console.log(error)
    return res.status(500).json({msg:"Ha ocurrido un error en el servidor"})
  }
 
};

const cambiarPassword = async (req = request, res = response) => {
  const codigo = req.body.codigo;
  const password = req.body.password;
  const verificarPassword = req.body.repeatPassword;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (password !== verificarPassword) {
      return res
        .status(400)
        .json({ msg: "Las contraseñas introducidas no coinciden" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const codigoCorrecto =
      "SELECT user_id FROM codigos_usuario WHERE codigo = ?";

    db_config.query(codigoCorrecto, [codigo], (error, results) => {
      if (error) {
        console.log(error);
        return res
          .status(500)
          .json({ msg: "Ocurrió un error al procesar la solicitud" });
      }
      if (results.length === 0) {
        return res
          .status(401)
          .json({ msg: "El código que has introducido es inválido" });
      }
      const userId = results[0].user_id;
      const cambiarPass = `UPDATE usuarios SET 
      password = ?
      WHERE user_id = ?`;

      db_config.query(
        cambiarPass,
        [hashPassword, userId],
        (error, resultadoBusqueda) => {
          if (error) {
            console.log(error);
            return res
              .status(500)
              .json({ msg: "Ocurrió un error al procesar la solicitud" });
          }
          eliminarCodigoBBDD(userId);
          return res
            .status(200)
            .json({ msg: "Has moficiado exitosamente tu contraseña" });
        }
      );
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ msg: "Ha ocurrido un error, contacte con el administrador" });
  }
};

const refrescarToken = (req = request, res = response) => {

  if(!req.payload) return;

  const refreshToken = req.cookies.refresh_token;
  console.log("-------------------")
  console.log(refreshToken)
  if (!refreshToken) {
    return res.status(403).send("Refresh token no proporcionado");
  }
  const query = `SELECT * FROM refresh_tokens WHERE token = ?`;
  db_config.query(query, [refreshToken], (err, results) => {
    if (err) throw err;
    console.log(results)
    if (results.length === 0) {
      return res.status(403).send("Refresh token inválido");
    }
    jwt.verify(refreshToken, process.env.TOKEN_KEY_REFRESH, (err, user) => {
      if (err) return res.status(403).send("Token no válido");
      const token = generarToken(results[0]);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      const query = `UPDATE refresh_tokens SET token = ?, expiracion = ? WHERE token = ?`;
      db_config.query(query, [token.refreshToken, expiryDate, refreshToken], (err) => {
        if (err) throw err;
        res.cookie("access_token", token.accessToken, {
          httpOnly: true,
          sameSite: "Strict",
        });
        res.cookie("refresh_token", token.refreshToken, {
          httpOnly: true,
          sameSite: "Strict",
        });
        res.status(200).json({ message: "Tokens renovados" });
      });
    });
  });
};

module.exports = {
  crearUsuario,
  ingresarUsuario,
  cerrarSesion,
  cambiarAvatar,
  mostrarPerfilPublico,
  mostrarPerfilPrivado,
  mostrarPublicacionesFavoritas,
  seguirUsuario,
  dejarSeguirUsuario,
  modificarBio,
  mostrarPostSeguidos,
  showListadoFollowers,
  showListadoFollowing,
  recuperarPassword,
  cambiarPassword,
  refrescarToken,
};
