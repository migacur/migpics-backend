// routes/notificationRoutes.js
const express = require('express');
const { sendNotification, getNotifications, markAsRead } = require('../controllers/notificaciones');
const notificacionesRouter = express.Router();

notificacionesRouter.post('/send', sendNotification);
notificacionesRouter.get('/:userId', getNotifications);
notificacionesRouter.patch('/:notificationId/read', markAsRead);

module.exports = notificacionesRouter;
