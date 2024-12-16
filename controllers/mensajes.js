const { request, response } = require("express");
const db_config = require("../config/db_config");
const actualizarMensajesLeidos = require("../helpers/updateReads");

const dataUsuarioMsg = async(req=request,res=response) => {
    const { userId } = req.params;

    try {
        const query = 'SELECT user_id,avatar,username FROM usuarios WHERE user_id = ?';

        db_config.query(query, [userId], (error, results) => {
            if (error) {
              return res.status(400).json({ msg: 'Ocurrió un error al acceder a este enlace' });
            }
            return res.status(200).json(results[0]);
          });
        
    } catch (error) {
        console.log( error )
        return res.status(500).json({ msg: 'Ha ocurrido un error, contacte con el administrador' });
    }
}

const enviarMsgUsuario = async(req=request,res=response) => {
    const userLogueado = req.payload.id;
    const { userId } = req.params;
    const msg = req.body.mensaje;

    if(!msg.trim().length){
      return res.status(400)
            .json({msg: 'El campo del mensaje no puede estar vacío'})
    }

    try {

      if(!userLogueado){
        return res.status(401).json({msg: 'No estás autorizado para ingresar a esta ruta'})
      }

      const buscarUsuario = 'SELECT usuarios.user_id FROM usuarios WHERE usuarios.user_id = ?'

      db_config.query(buscarUsuario, [userId], (err, resultado) => {
        console.log(resultado[0].user_id)
        if (err) {
          return res.status(400).json({ msg: 'No se pudo enviar el mensaje' });
        }if(resultado.length === 0){
          return res.status(400).json({ msg: 'Usuario no encontrado'});
        }if(resultado[0].user_id === userLogueado){
          return res.status(401).json({ msg: 'No puedes enviarte mensajes a ti mismo'});
        }
      });

        const query = 'INSERT INTO mensajes (user_envia, user_recibe, contenido, fecha_enviado) VALUES (?, ?, ?, NOW())';

        db_config.query(query, [userLogueado,userId,msg], (err, results) => {
            if (err) {
              return res.status(400).json({ msg: 'No se pudo enviar el mensaje' });
            }

            return res.status(200).json({ msg: 'El mensaje ha sido enviado exitosamente'});
          
          });

  
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Ha ocurrido un error al procesar su solicitud' });
    } 
}

const mostrarListadoMensajes = async(req=request,res=response) => {
 
    const userLogueado = req.payload.id;
    
  const pagina = req.query.pagina || 1;
  const elementosPorPagina = req.query.elementosPorPagina || 10;
  const offset = (pagina - 1) * elementosPorPagina;

    try {

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

        db_config.query(query, [userLogueado,userLogueado,parseInt(elementosPorPagina),offset], (err, results) => {
            if (err) {
              return res.status(400).json({ msg: 'No se pudo mostrar los mensajes recibidos' });
            }
              return res.status(200).json(results);
          });
  
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
    
    try {
   
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

        db_config.query(query, [userLogueado,userId,userId,userLogueado,parseInt(elementosPorPagina),offset], (err, results) => {
            if (err) {
              return res.status(400).json({ msg: 'No se pudo mostrar los mensajes recibidos' });
            }
              actualizarMensajesLeidos(userLogueado)
              return res.status(200).json(results);
          });
  
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Ha ocurrido un error al procesar su solicitud' });
    }

   
 }

 const eliminarMensaje = async(req=request,res=response) => {
    const { mensajeId } = req.params;
    const userLogueado = req.payload.id
    const query = 'DELETE FROM mensajes where mensaje_id = ? AND user_envia = ?'

    db_config.query(query, [mensajeId,userLogueado], (error, results) => {
        if (error){
          return res.status(400).json({msg: 'Ocurrió un error al realizar esta acción'})
        }
          return res.status(200).json({msg: 'Se ha eliminado el mensaje seleccionado'})
      });
 }

module.exports = {
    dataUsuarioMsg,
    enviarMsgUsuario,
    mostrarListadoMensajes,
    mostrarChat,
    eliminarMensaje
}