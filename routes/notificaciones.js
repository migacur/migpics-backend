// routes/notificationRoutes.js
const express = require('express');
const { buscarNotificaciones, marcarNotificacion } = require('../controllers/notificaciones');
const authMiddleware = require('../middleware/AuthJWTCookie');
const notificacionesRouter = express.Router();

notificacionesRouter.get('/cargar-notificaciones/:userId',authMiddleware, buscarNotificaciones);
notificacionesRouter.put('/:notificationId/read', marcarNotificacion);

module.exports = notificacionesRouter;
