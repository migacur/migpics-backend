const { Router } = require("express");
const { obtenerTopLikes, 
        obtenerTopComentarios } = require("../controllers/top_post");
const TopPostRouter = Router();

// Publicaciones con más likes
TopPostRouter.get('/top-post-likes',obtenerTopLikes)
// Publicaciones con más comentarios
TopPostRouter.get('/top-post-comments',obtenerTopComentarios)

module.exports = TopPostRouter;