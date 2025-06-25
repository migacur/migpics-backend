// controllers/notificationController.js
const { request, response } = require("express");
const db_config = require("../config/db_config");

const buscarNotificaciones = async(req=request, res=response) => {
  const { userId } = req.params;
  const userLogueado = req.payload.id;

  if(!userId || !userLogueado){
    return res.status(401).json({ msg: 'Ocurrió un problema al autenticar el usuario' });
  }

  try {
    const query = `SELECT COUNT(*) AS unread_count FROM notificaciones 
                   WHERE user_recibe = ? AND is_read = 0`;
    const [result] = await db_config.query(query, [userId]);
    
    res.json({ unread_count: result[0].unread_count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const marcarNotificacion = async(req=request, res=response) => {
  const { userId } = req.params;
  const userLogueado = req.payload.id;

  if(!userId || !userLogueado){
     return res.status(401).json({ msg: 'NO estás autorizado para esta acción' });
  }

  try {
     const query = 'UPDATE notificaciones SET is_read = 1 WHERE user_envia = ? AND user_recibe = ?';
     await db_config.query(query, [userId,userLogueado])
     res.status(200).json({ msg: 'Se han leído las notificaciones' });
  } catch (e) {
    console.log(e)
     return res.status(500).json({ msg: 'Error interno del servidor' });
  }
 
};

const guardarNotificacion = async(req=request,res=response) => {
  const { user_id, mensaje} = req.body;
  const userLogueado = req.payload.id;

    if(!user_id || !mensaje){
     return res.status(401).json({ msg: 'Faltan datos para realizar esta acción' });
  }

     if(!userLogueado){
     return res.status(401).json({ msg: 'Usuario NO autorizado' });
  }
  
  try {
    const query = `INSERT INTO notificaciones (tipo_notificacion,mensaje,user_envia,user_recibe,created_at)
                   VALUES (?,?,?,?,?)`;
    await db.query(query, [1,mensaje,userLogueado,user_id,new Date()]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  buscarNotificaciones,
  marcarNotificacion,
  guardarNotificacion
};
