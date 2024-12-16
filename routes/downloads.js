const { Router } = require("express");
const { descargarImagen } = require("../controllers/downloads");
const downloadRouter = Router()

downloadRouter.post('/descargar-imagen/:postId',descargarImagen)

module.exports = downloadRouter;