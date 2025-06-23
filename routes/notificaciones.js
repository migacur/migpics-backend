// routes/notificationRoutes.js
const express = require('express');
const { buscarNotificaciones, marcarNotificacion } = require('../controllers/notificaciones');
const notificacionesRouter = express.Router();

notificacionesRouter.get('/:userId', buscarNotificaciones);
notificacionesRouter.put('/:notificationId/read', marcarNotificacion);

module.exports = notificacionesRouter;
