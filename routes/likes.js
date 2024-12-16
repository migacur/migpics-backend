const { Router } = require("express");
const { darLikePost } = require("../controllers/likes");
const authMiddleware = require("../middleware/AuthJWTCookie");

const likeRouter = Router()

likeRouter.post('/dar-like/:postId',authMiddleware, darLikePost)

module.exports = likeRouter;