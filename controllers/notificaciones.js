// controllers/notificationController.js

const db= require("../config/db_config");

const sendNotification = (req, res) => {
  const { userId, message } = req.body;

  const query = 'INSERT INTO notificaciones (user_id, mensaje) VALUES (?, ?)';
  db.query(query, [userId, message], (err, result) => {
    if (err) {
      console.error('Error al guardar la notificación:', err);
      return res.status(500).json({ msg: 'Error interno del servidor' });
    }

    const io = req.app.get('io');
    io.to(userId).emit('receive_notification', {
      id: result.insertId,
      message,
      is_read: false
    });

    res.status(201).json({ msg: 'Notificación enviada y guardada' });
  });
};

const getNotifications = (req, res) => {
  const { userId } = req.params;

  const query = 'SELECT * FROM notificaciones WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error al obtener notificaciones:', err);
      return res.status(500).json({ msg: 'Error interno del servidor' });
    }
    res.status(200).json(results);
  });
};

const markAsRead = (req, res) => {
  const { notificationId } = req.params;

  const query = 'UPDATE notificaciones SET is_read = TRUE WHERE id = ?';
  db.query(query, [notificationId], (err) => {
    if (err) {
      console.error('Error al marcar la notificación como leída:', err);
      return res.status(500).json({ msg: 'Error interno del servidor' });
    }
    res.status(200).json({ msg: 'Notificación marcada como leída' });
  });
};

module.exports = {
  sendNotification,
  getNotifications,
  markAsRead
};
