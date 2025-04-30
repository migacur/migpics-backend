const { Router } = require("express");
const { agregarPost, 
    mostrarPostRecientes, 
    mostrarPostPorId, 
    mostrarTendencias,
    mostrarComentariosPost,
    agregarComentario,
    eliminarComentario,
    buscarPost,
    mostrarPostUsusario,
    mostrarComentariosUsuario,
    eliminarPublicacion,
    editarPublicacion,
    enviarRepuestaComentario,
    mostrarRespuestasComentario,
    borrarRespuestasComentario,
    mostrarListadoLikes} = require("../controllers/post");
const uploadFileMiddleware = require("../middleware/uploadFile");
const authMiddleware = require("../middleware/AuthJWTCookie");
const postRouter = Router();

postRouter.post('/agregar-post/:id',[authMiddleware,uploadFileMiddleware],agregarPost)
postRouter.get('/', mostrarPostRecientes)
postRouter.get('/tendencias', mostrarTendencias)
postRouter.get('/post/:postId',authMiddleware,mostrarPostPorId)
postRouter.get('/buscar-post/:palabra',buscarPost)
postRouter.get('/listado-post/:username',mostrarPostUsusario)
postRouter.get('/mostrar-comentarios/:postId',authMiddleware,mostrarComentariosPost)
postRouter.get('/comentarios/:username',authMiddleware,mostrarComentariosUsuario)
postRouter.post('/agregar-comentario/:postId',authMiddleware,agregarComentario)
postRouter.post('/agregar-respuesta',authMiddleware,enviarRepuestaComentario)
postRouter.get('/mostrar-respuestas/:comentarioId',mostrarRespuestasComentario)
postRouter.delete('/borrar-respuesta/:id',borrarRespuestasComentario)
postRouter.delete('/borrar-comentario/:id',authMiddleware,eliminarComentario)
postRouter.delete('/eliminar-post/:postId',authMiddleware,eliminarPublicacion)
postRouter.put('/editar-post/:postId',authMiddleware,editarPublicacion)
postRouter.get('/mostrar-likes/:postId',authMiddleware, mostrarListadoLikes)

module.exports = postRouter;