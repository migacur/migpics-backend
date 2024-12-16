const { Router } = require("express");
const { agregarFavoritos } = require("../controllers/favoritos");
const authMiddleware = require("../middleware/AuthJWTCookie");

const favRouter = Router()

favRouter.post('/agregar-favoritos/:postId',authMiddleware,agregarFavoritos)

module.exports = favRouter;