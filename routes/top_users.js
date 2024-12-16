const { Router } = require("express");
const { showTopPostUsers, 
        showTopLikeUsers } = require("../controllers/top_users");
const TopUserRouter = Router();

// User con más publicaciones
TopUserRouter.get('/top-user-post',showTopPostUsers)
// User con más likes en sus publicaciones
TopUserRouter.get('/top-user-likes',showTopLikeUsers)


module.exports = TopUserRouter;