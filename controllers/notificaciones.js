// controllers/notificationController.js
const { request, response } = require("express");
const db= require("../config/db_config");

const buscarNotificaciones = async(req=request, res=response) => {
  const { userId } = req.params;
  const userLogueado = req.payload.id;

  if(!userId || !userLogueado){
    return res.status(401).json({ msg: 'El usuario no se encuentra logueado' });
  }

  if(userId !== userLogueado){
    return res.status(401).json({ msg: 'Ocurrió un error al verificar el usuario' });
  }

  try {
     const query = 'SELECT COUNT(*) AS contador FROM notificaciones WHERE user_id = ?';
     const [results] = await db.query(query, [userId])
     const notificaciones = results[0].contador;
     res.status(200).json(notificaciones);
  } catch (e) {
    console.log(e)
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

const marcarNotificacion = async(req=request, res=response) => {
  const { notificationId } = req.params;

  try {
     const query = 'UPDATE notificaciones SET is_read = 1 WHERE user_id = ?';
     await db.query(query, [notificationId])
     res.status(200).json({ msg: 'Se han leído las notificaciones' });
  } catch (e) {
    console.log(e)
     return res.status(500).json({ msg: 'Error interno del servidor' });
  }

    
  
};

module.exports = {
  buscarNotificaciones,
  marcarNotificacion
};
