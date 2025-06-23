// controllers/notificationController.js
const { request, response } = require("express");
const db= require("../config/db_config");

const buscarNotificaciones = async(req=request, res=response) => {
  const { userId } = req.params;

  try {
     const query = 'SELECT COUNT(*) AS contador FROM notificaciones WHERE user_id = ?';
     await db.query(query, [userId])
     res.status(200).json(results);
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
