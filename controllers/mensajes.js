const { request, response } = require("express");
const db_config = require("../config/db_config");
const actualizarMensajesLeidos = require("../helpers/updateReads");

const dataUsuarioMsg = async(req=request,res=response) => {
    const { userId } = req.params;
    const query = 'SELECT user_id,avatar,username FROM usuarios WHERE user_id = ?'

    try {
      const [results] = await db_config.query(query, [userId])
      return res.status(200).json(results[0]);
    } catch (error) {
      console.log(error)
      return res.status(400)
              .json({ msg: 'Ocurrió un error al acceder a este enlace' });
    }

}


const enviarMsgUsuario = async (req = request, res = response) => {
  const userLogueado = req.payload.id;
  const userId  = parseInt(req.params.userId);
  const msg = req.body.mensaje?.trim();
console.log(req.params)
  // Validaciones iniciales
  if (!msg || msg.length < 5) {
      return res.status(400).json({ msg: 'El mensaje debe tener al menos 5 caracteres' });
  }

  if (!userLogueado || !userId) {
      return res.status(401).json({ msg: 'Usuario NO autorizado' });
  }

  const buscarUsuario = 'SELECT user_id FROM usuarios WHERE user_id = ?';
  const insertarMensaje = 'INSERT INTO mensajes (user_envia, user_recibe, contenido, fecha_enviado) VALUES (?, ?, ?, NOW())';

  try {
      // Ejecuta en secuencia: 1. Busca usuario, 2. Inserta mensaje
      const [usuarios] = await db_config.query(buscarUsuario, [userId]);
      
      if (usuarios.length === 0) {
          return res.status(404).json({ msg: 'Usuario no encontrado' });
      }

      const usuarioRecibe = usuarios[0];
      
      if (usuarioRecibe.user_id === userLogueado) {
          return res.status(400).json({ msg: 'No puedes enviarte mensajes a ti mismo' });
      }

      // Inserta el mensaje
      const [resultado] = await db_config.query(insertarMensaje, [userLogueado, userId, msg]);
      
      // Verifica que se haya insertado correctamente
      if (resultado.affectedRows === 0) {
          throw new Error('No se pudo insertar el mensaje');
      }

      return res.status(200).json({ msg: 'Mensaje enviado exitosamente' });

  } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: 'Error al enviar el mensaje' });
  }
};


const mostrarListadoMensajes = async(req=request,res=response) => {
 
  const userLogueado = req.payload.id;
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 10;
  const offset = (pagina - 1) * elementosPorPagina;

  if(!userLogueado){
    return res.status(401).json({msg: 'No estás autorizado para ingresar a este enlace'})
  }

    const query = `       
SELECT 
m1.mensaje_id,
m1.contenido,
m1.user_recibe,
m1.user_envia,
m1.fecha_enviado,
u1.avatar AS avatar_envia,
u2.avatar AS avatar_recibe,
m1.leido,
u1.username AS enviado_por,
u2.username AS recibido_por,
CASE 
WHEN m1.user_recibe = u1.user_id OR u2.user_id AND m1.leido = 0 THEN 'Mensaje(s) sin leer'
WHEN m1.user_recibe = u1.user_id OR u2.user_id AND m1.leido = 1 THEN 'No hay mensaje nuevo'
ELSE NULL 
END AS mensaje_nuevo
FROM 
mensajes m1
JOIN usuarios u1 ON u1.user_id = m1.user_envia
JOIN usuarios u2 ON u2.user_id = m1.user_recibe
WHERE 
(u1.user_id = ? OR u2.user_id = ?)
AND m1.fecha_enviado = (
SELECT MAX(m2.fecha_enviado)
FROM mensajes m2
WHERE LEAST(m2.user_envia, m2.user_recibe) = LEAST(m1.user_envia, m1.user_recibe)
AND GREATEST(m2.user_envia, m2.user_recibe) = GREATEST(m1.user_envia, m1.user_recibe)
)
ORDER BY 
m1.fecha_enviado DESC
LIMIT ? OFFSET ?;
    `

    try {
      const [results] = await db_config.query(query, [userLogueado,userLogueado,parseInt(elementosPorPagina),offset])
      return res.status(200).json(results);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Ha ocurrido un error al procesar su solicitud' });
    }
   
 }

 const mostrarChat = async(req=request,res=response) => {
    const { userId } = req.params;
    const userLogueado = req.payload.id;
    const pagina = req.query.pagina || 1;
    const elementosPorPagina = req.query.elementosPorPagina || 10;
    const offset = (pagina - 1) * elementosPorPagina;
    
    if(!userLogueado){
      return res.status(401).json({msg: 'No estás autorizado para ingresar a esta ruta'})
    }

    if(parseInt(userId) === userLogueado){
      return res.status(401).json({msg: 'No estás autorizado para ingresar a esta ruta'})
    }

      const query = `
      
SELECT mensajes.mensaje_id,mensajes.contenido, mensajes.user_recibe, mensajes.user_envia,
mensajes.fecha_enviado, 
usuarios.username AS enviado_por, usuarios.avatar,
(SELECT usuarios.username FROM usuarios WHERE usuarios.user_id = mensajes.user_recibe) AS recibido_por
FROM mensajes
LEFT JOIN usuarios 
ON usuarios.user_id = mensajes.user_envia
WHERE usuarios.user_id IN(?,?) AND mensajes.user_recibe IN(?,?) 
ORDER BY mensajes.fecha_enviado DESC
LIMIT ? OFFSET ?;
      `

    try {  
    const [results] = await db_config.query(query, [userLogueado,userId,userId,userLogueado,parseInt(elementosPorPagina),offset])
    actualizarMensajesLeidos(userLogueado)
    return res.status(200).json(results);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ msg: 'Ha ocurrido un error al procesar su solicitud' });
    }
   
 }

 const eliminarMensaje = async(req=request,res=response) => {
    const { mensajeId } = req.params;
    const userLogueado = req.payload.id
    const query = 'DELETE FROM mensajes where mensaje_id = ? AND user_envia = ?'

    try {
      await db_config.query(query, [mensajeId,userLogueado])
      return res.status(200).json({msg: 'Se ha eliminado el mensaje seleccionado'})
    } catch (e) {
      console.log(e)
      return res.status(400).json({msg: 'Ocurrió un error al realizar esta acción'})
    }
 }

module.exports = {
    dataUsuarioMsg,
    enviarMsgUsuario,
    mostrarListadoMensajes,
    mostrarChat,
    eliminarMensaje
}