const { Router } = require("express");
const { dataUsuarioMsg, 
        enviarMsgUsuario, 
        mostrarListadoMensajes,
        mostrarChat,
        eliminarMensaje} = require("../controllers/mensajes");
const authMiddleware = require("../middleware/AuthJWTCookie");
const msgRouter = Router();

msgRouter.get('/usuario-mensaje/:userId',authMiddleware,dataUsuarioMsg)
msgRouter.get('/mostrar-mensajes/:userId',authMiddleware,mostrarListadoMensajes)
msgRouter.get('/mostrar-chat/:userId',authMiddleware,mostrarChat)
msgRouter.post('/enviar-mensaje/:userId',authMiddleware,enviarMsgUsuario)
msgRouter.delete('/eliminar-mensaje/:mensajeId',authMiddleware,eliminarMensaje)


module.exports = msgRouter;