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
/*
const crearUsuario = async (req = request, res = response) => {
  const { username, password, repeat, email } = req.body;
  const avatar = "https://i.postimg.cc/0Nq25498/avatar.png";
  const fechaActual = new Date(); 
  const fecha_registrado = fechaActual.toISOString().slice(0, 19).replace('T', ' ');
  
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
      fecha_registrado
    };

    const [buscarUser] = await db_config.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username])

        if (buscarUser.length > 0) {
          return res
            .status(400)
            .json({ msg: "Ya existe un usuario registrado con ese nombre" });
        }

    const [buscarEmail] = await db_config.query(
          "SELECT * FROM usuarios WHERE email = ?",
          [email])

            if (buscarEmail.length > 0) {
              return res.status(400).json({
                msg: "El correo electrónico ya se encuentra registrado",
              });
            }

            await db_config.query(
              "INSERT INTO usuarios SET ?",
              nuevoUsuario)

                return res
                  .status(200)
                  .json({ msg: "Usuario registrado correctamente" });
              
            
 
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      msg: "Hubo un error, contacte con el administrador de la web",
    });
  }
};
*/
const crearUsuario = async (req, res) => {
  const { username, password, repeat, email } = req.body;
  const avatar = "https://i.postimg.cc/0Nq25498/avatar.png";
  
  try {
    // Validación de express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (password !== repeat) {
      return res.status(400).json({ msg: "Las contraseñas no coinciden" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    // Iniciar transacción
    const connection = await db_config.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar usuario y email en una sola consulta (mejor performance)
      const [userExists] = await connection.query(
        "SELECT username, email FROM usuarios WHERE username = ? OR email = ?",
        [username, email]
      );

      if (userExists.some(u => u.username === username)) {
        return res.status(400).json({ msg: "Nombre de usuario ya registrado" });
      }

      if (userExists.some(u => u.email === email)) {
        return res.status(400).json({ msg: "Correo electrónico ya registrado" });
      }

      // Insertar con fecha manejada por MySQL
      await connection.query(
        "INSERT INTO usuarios (username, avatar, password, email, fecha_registrado) VALUES (?, ?, ?, ?, NOW())",
        [username, avatar, hashPassword, email]
      );

      await connection.commit();
      res.status(200).json({ msg: "Usuario registrado correctamente" });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (e) {
    console.error('Error en crearUsuario:', e);
    
    let msg = "Error interno del servidor";
    if (e.code === 'ER_DUP_ENTRY') {
      msg = "El usuario o correo ya existe";
    }
    
    res.status(500).json({ msg });
  }
};

const ingresarUsuario = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validaciones
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Buscar usuario
    const [users] = await db_config.query(
      "SELECT * FROM usuarios WHERE username = ?", 
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ msg: "Credenciales inválidas" });
    }

    const user = users[0];
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ msg: "Credenciales inválidas" });
    }

    // Generar tokens
    const token = generarToken(user);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Transacción para insertar token
    const connection = await db_config.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        `INSERT INTO refresh_tokens (token, user_id, expiracion) VALUES (?, ?, ?)`,
        [token.refreshToken, user.user_id, expiryDate]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  // Cookie para el Access Token
res.cookie("access_token", token.accessToken, {
  httpOnly: true,
  secure: true, 
  sameSite: "None",
//  domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
  maxAge: 15 * 60 * 1000, // 15 minutos
  path: "/"
});

// Cookie para el Refresh Token (nombre diferente)
res.cookie("refresh_token", token.refreshToken, { // 👈 refresh_token
  httpOnly: true,
  secure: true,
  sameSite: "None",
 // domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: "/" // 👈 Ruta específica para refresh
});

console.log("Headers de cookies enviados:", res.getHeaders()["set-cookie"]);
/*
    res.cookie("refresh_token", token.refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });
*/
    return res.status(200).json({
      user: {
        id: user.user_id,
        username: user.username
      }
    });

  } catch (e) {
    console.error("Error en ingresarUsuario:", e);
    
    const statusCode = e.code === 'ER_DUP_ENTRY' ? 409 : 500;
    const msg = e.code === 'ER_DUP_ENTRY' 
      ? "Sesión ya activa" 
      : "Error interno del servidor";

    return res.status(statusCode).json({ msg });
  }
};

const cerrarSesion = async (req, res) => {
  try {
    const usuarioId = req.body.userId;

    if (!usuarioId) {
      return res.status(400).json({ msg: "Se requiere ID de usuario" });
    }

    // 1. Eliminar tokens
    const [result] = await db_config.query(
      "DELETE FROM refresh_tokens WHERE user_id = ?",
      [usuarioId]
    );

    // 2. Verificar si se eliminó algo (opcional)
    if (result.affectedRows === 0) {
      console.warn(`No había tokens para el usuario ${usuarioId}`);
    }

    // 3. Limpiar cookies (con mismas opciones de creación)
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    // 4. Respuesta exitosa
    res.status(200).json({ msg: "Sesión cerrada exitosamente" });

  } catch (error) {
    console.error("Error en cerrarSesion:", error);
    
    // 5. Manejo específico de errores de BBDD
    const msg = error.code === 'ER_LOCK_WAIT_TIMEOUT' 
      ? "Intenta cerrar sesión nuevamente" 
      : "Error interno";

    res.status(500).json({ msg });
  }
};

const cambiarAvatar = async (req = request, res = response) => {
  const { id } = req.params;
  const userOn = req.payload.id;
  let connection;

  try {
    // Validaciones iniciales
    if (!req.file) {
      return res.status(400).json({ msg: "Avatar no proporcionado" });
    }
    if (parseInt(id) !== userOn) {
      return res.status(401).json({ msg: "Usuario no autorizado" });
    }

    connection = await db_config.getConnection();
    await connection.beginTransaction();

    // 1. Subir imagen a Cloudinary desde el buffer
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    const archivo = await cloudinary.uploader.upload(dataURI, {
      folder: "avatars",
      allowed_formats: ["jpg", "png", "webp"]
    });

    // 2. Obtener y eliminar avatar antiguo
    const [usuarios] = await connection.query(
      "SELECT avatar FROM usuarios WHERE user_id = ? FOR UPDATE",
      [id]
    );
    if (usuarios.length === 0) throw new Error("Usuario no existe");

    const avatarAnterior = usuarios[0].avatar;
    if (avatarAnterior) {
      await eliminarImagenCloudinary(avatarAnterior); 
    }

    // 3. Actualizar en BBDD
    await connection.query(
      "UPDATE usuarios SET avatar = ? WHERE user_id = ?",
      [archivo.secure_url, id]
    );

    await connection.commit();

    res.status(200).json({ 
      success: true,
      avatar: archivo.secure_url
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error(`Error en cambiarAvatar [UID:${id}]:`, error);
    
    const statusCode = error.message.includes("No autorizado") ? 403 : 500;
    res.status(statusCode).json({
      error: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack })
    });

  } finally {
    if (connection) connection.release();
  }
};

const mostrarPerfilPublico = async (req = request, res = response) => {
  const { username } = req.params;
  const userLogueado = req.payload.id;
//console.log(req.payload.username.toLowerCase(),username)
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

  try {
    const [results] = await db_config.query(
      queryUser,
      [userLogueado, username, username])

  if(!results.length){
    return res
    .status(500)
    .json({ msg: `El usuario ${username} no existe` });
  }
    return res.status(200).json(results[0]);
  } catch (error) {
    return res
    .status(500)
    .json({ msg: "Ocurrió un error al mostrar este enlace" });
  }

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
 
  try {
    const [results] = await db_config.query(query, [userLogin])
    if(!results.length) return res.status(401).json({msg:"No puedes acceder a este enlace"});
    return res.status(200).json(results[0]);
  } catch (error) {
    return res
    .status(500)
    .json({ msg: "Ocurrió un error al ingresar a esta ruta" });
  }

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

  try {
    const [results] = await db_config
          .query(query,[userId, parseInt(elementosPorPagina), offset])
    if(!results.length){
      return res.status(200).json({msg:"No se encontraron publicaciones para este usuario"})
    }
    return res.status(200).json(results);
  } catch (error) {
    return res
    .status(500)
    .json({ msg: "Ocurrió un error al mostrar la data" });
  }

};
/*
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
}; */

const dejarSeguirUsuario = async (req, res) => {
  const { userId } = req.params;
  const seguidorId = req.payload.id;
  let connection;

  try {
    // Validación de entradas
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    if (seguidorId === parseInt(userId)) {
      return res.status(400).json({ error: "Acción no permitida" });
    }

    connection = await db_config.getConnection();
    await connection.beginTransaction();

    // 1. Verificar existencia previa del seguimiento
    const [seguimiento] = await connection.query(
      `SELECT COUNT(*) AS count FROM seguidores 
       WHERE seguidor_id = ? AND followed_id = ? FOR UPDATE`,
      [seguidorId, userId]
    );

    if (seguimiento[0].count === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "No estabas siguiendo a este usuario" });
    }

    // 2. Eliminación atómica en ambas tablas
    await connection.query(
      `DELETE FROM seguidores 
       WHERE seguidor_id = ? AND followed_id = ?`,
      [seguidorId, userId]
    );

    await connection.query(
      `DELETE FROM seguidos 
       WHERE userId = ? AND seguido_id = ?`,
      [seguidorId, userId]
    );

    await connection.commit();

    res.status(200).json({ 
      success: true,
      message: "Dejaste de seguir al usuario",
      isFollowing: false,
      stats: {
        seguidores: await obtenerContadorSeguidores(userId),
        seguidos: await obtenerContadorSeguidos(seguidorId)
      }
    });

  } catch (error) {
    if (connection) await connection.rollback();
    
    console.error(`Error en dejarSeguirUsuario [UID:${seguidorId}]->[UID:${userId}]:`, error);
    
    res.status(500).json({
      error: "Error al procesar la solicitud",
      code: error.code || "UNKNOWN_ERROR",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });

  } finally {
    if (connection) connection.release();
  }
};

const seguirUsuario = async (req, res) => {
  const seguidorId = req.payload.id;
  const { userId } = req.params;
  let connection;

  try {
    if (seguidorId === parseInt(userId)) {
      return res.status(400).json({ msg: "No puedes seguirte a ti mismo" });
    }

    connection = await db_config.getConnection(); // 👈 Obtener conexión
    await connection.beginTransaction(); // 👈 Iniciar transacción

    // 1. Verificar si ya existe el seguimiento (usando la misma conexión)
    const [result] = await connection.query(
      "SELECT COUNT(*) AS count FROM seguidores WHERE seguidor_id = ? AND followed_id = ? FOR UPDATE", // 🔒 Bloqueo de filas
      [seguidorId, userId]
    );

    if (result[0].count > 0) {
      await connection.rollback(); // 👈 Deshacer transacción
      return res.status(400).json({ msg: "Ya sigues a este usuario" });
    }

    // 2. Insertar en ambas tablas
    await connection.query(
      "INSERT INTO seguidores (seguidor_id, followed_id, fecha) VALUES (?, ?, NOW())",
      [seguidorId, userId]
    );

    await connection.query(
      "INSERT INTO seguidos (userId, seguido_id, fecha) VALUES (?, ?, NOW())",
      [seguidorId, userId]
    );

    await connection.commit(); // 👈 Confirmar cambios
    res.status(200).json({ msg: "Ahora sigues a este usuario", isFollow: true });

  } catch (err) {
    if (connection) await connection.rollback(); // 👈 Revertir en caso de error
    console.error("Error en seguirUsuario:", err);

    // Manejar errores de duplicidad (si hay UNIQUE constraint)
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ msg: "Ya sigues a este usuario" });
    } else {
      res.status(500).json({ msg: "Error al seguir al usuario" });
    }

  } finally {
    if (connection) connection.release(); // 👈 Liberar conexión SIEMPRE
  }
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

  try {
    await db_config.query(query, [data, userId])
    return  res.status(200).json({
      msg: "Se ha editado exitosamente su biografía",
    });
  } catch (error) {
    console.log(error);
      return res.status(500).json({
        msg: "Error al realizar esta acción",
      });
  }
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

  try {
    const [results] = await db_config.query(
      query,
      [userToken, parseInt(elementosPorPagina), offset])
      return res.status(200).json(results);
  } catch (error) {
    console.log(error)
     return res
    .status(500)
    .json({ msg: "Ocurrió un error al mostrar las publicaciones" });
  }

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

  try {
    const [results] = await db_config.query(
      query,
      [userId, parseInt(elementosPorPagina), offset])
      return res.status(200).json(results);
  } catch (error) {
    console.log(error)
   return res
    .status(500)
    .json({ msg: "Ocurrió un error al mostrar las publicaciones" });
  }

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

  try {
    const [results] = await db_config.query(
      query,
      [userId, parseInt(elementosPorPagina), offset])
      return res.status(200).json(results);   
  } catch (error) {
    console.log(error)
    return res
    .status(500)
    .json({ msg: "Ocurrió un error al mostrar las publicaciones" });
  }
};

const recuperarPassword = async (req, res) => {
  const { email } = req.body;
  let connection;

  try {
    if (!email) {
      return res.status(400).json({ msg: "Introduce un email válido" });
    }

    connection = await db_config.getConnection();
    await connection.beginTransaction(); // Iniciar transacción

    // 1. Verificar si el email existe
    const [usuarios] = await connection.query(
      "SELECT user_id, username, email FROM usuarios WHERE email = ? FOR UPDATE",
      [email]
    );

    if (usuarios.length === 0) {
      await connection.rollback();
      return res.status(404).json({ msg: "Email no registrado" });
    }

    const { user_id, username } = usuarios[0];
    const code = generarCodigo(8);

    // 2. Eliminar códigos previos (opcional pero recomendado)
    await connection.query(
      "DELETE FROM codigos_usuario WHERE user_id = ?",
      [user_id]
    );

    // 3. Insertar nuevo código
    await connection.query(
      "INSERT INTO codigos_usuario (user_id, codigo, fecha_creado) VALUES (?, ?, NOW())",
      [user_id, code]
    );

    await connection.commit(); // Confirmar cambios

    // 4. Enviar email y programar eliminación (fuera de la transacción)
    sendEmailCode({ email, username }, code);
    setTimeout(() => eliminarCodigoBBDD(user_id), 5 * 60 * 1000);

    res.status(200).json({ msg: "Código enviado exitosamente" });

  } catch (error) {
    if (connection) await connection.rollback(); // Revertir en caso de error
    console.error("Error en recuperarPassword:", error);

    // Manejar errores de MySQL
    let msg = "Error al procesar la solicitud";
    if (error.code === "ER_DUP_ENTRY") msg = "Código ya generado";
    
    res.status(500).json({ msg });

  } finally {
    if (connection) connection.release(); // Liberar conexión
  }
};

const cambiarPassword = async (req, res) => {
  const { codigo, password, repeatPassword } = req.body;
  let connection;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (password !== repeatPassword) {
      return res.status(400).json({ msg: "Las contraseñas no coinciden" });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    connection = await db_config.getConnection();
    await connection.beginTransaction(); // 👈 Iniciar transacción

    // 1. Verificar código y bloquear registro
    const [codigos] = await connection.query(
      `SELECT user_id FROM codigos_usuario 
       WHERE codigo = ? FOR UPDATE`, // 🔒 Bloquea el registro
      [codigo]
    );

    if (codigos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ msg: "Código inválido" });
    }

    const userId = codigos[0].user_id;

    // 2. Actualizar contraseña
    await connection.query(
      `UPDATE usuarios SET password = ? 
       WHERE user_id = ?`,
      [hashPassword, userId]
    );

    // 3. Eliminar código (dentro de la transacción)
    await connection.query(
      `DELETE FROM codigos_usuario 
       WHERE user_id = ?`,
      [userId]
    );

    await connection.commit(); // ✅ Confirmar cambios

    res.status(200).json({ msg: "Contraseña actualizada exitosamente" });

  } catch (error) {
    if (connection) await connection.rollback(); // ❌ Revertir cambios
    console.error("Error en cambiarPassword:", error);

    // Manejo específico de errores
    let msg = "Error al procesar la solicitud";
    if (error.code === "ER_NO_REFERENCED_ROW_2") msg = "Usuario no existe";
    
    res.status(500).json({ msg });

  } finally {
    if (connection) connection.release(); // 🔄 Liberar conexión
  }
};

const refrescarToken = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  let connection;

  try {
    // Validación básica
    if (!refreshToken) {
      return res.status(403).json({ error: "Refresh token requerido" });
    }

    connection = await db_config.getConnection();
    await connection.beginTransaction(); // 🛡️ Transacción para atomicidad

    // 1. Verificar token en BBDD y bloquear registro
    const [tokens] = await connection.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? FOR UPDATE`,
      [refreshToken]
    );

    if (tokens.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: "Token inválido" });
    }

    // 2. Verificar firma JWT
    const decoded = jwt.verify(refreshToken, process.env.TOKEN_KEY_REFRESH);
    
    // 3. Generar nuevos tokens
    const newTokens = generarToken(tokens[0]);
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // 4. Actualizar token en BBDD
    await connection.query(
      `UPDATE refresh_tokens 
       SET token = ?, expiracion = ? 
       WHERE token = ?`,
      [newTokens.refreshToken, expiryDate, refreshToken]
    );

    await connection.commit();

    // 5. Configurar cookies para producción
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 🔒 Solo HTTPS en prod
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    };

    res
      .cookie("access_token", newTokens.accessToken, cookieOptions)
      .cookie("refresh_token", newTokens.refreshToken, cookieOptions)
      .status(200)
      .json({ message: "Tokens renovados" });

  } catch (error) {
    if (connection) await connection.rollback();
    
    console.error("Error en refrescarToken:", error);
    
    // Manejo específico de errores JWT
    let statusCode = 500;
    if (error instanceof jwt.TokenExpiredError) {
      statusCode = 403;
      error.message = "Token expirado";
    } else if (error instanceof jwt.JsonWebTokenError) {
      statusCode = 403;
      error.message = "Token inválido";
    }

    res.status(statusCode).json({ error: error.message });

  } finally {
    if (connection) connection.release();
  }
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
