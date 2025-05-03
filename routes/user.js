const { Router } = require("express");
const {
  crearUsuario,
  ingresarUsuario,
  mostrarPerfilPublico,
  mostrarPerfilPrivado,
  mostrarPublicacionesFavoritas,
  seguirUsuario,
  dejarSeguirUsuario,
  modificarBio,
  mostrarPostSeguidos,
  showListadoFollowers,
  showListadoFollowing,
  cambiarAvatar,
  recuperarPassword,
  cambiarPassword,
  cerrarSesion,
  refrescarToken,
} = require("../controllers/user");
const uploadFileMiddleware = require("../middleware/uploadFile");
const authMiddleware = require("../middleware/AuthJWTCookie");
const { body } = require("express-validator");
const userRouter = Router();

userRouter.post(
  "/registrar-usuario",
  [
    body("username")
      .isLength({ min: 8 })
      .withMessage("El usuario debe tener al menos 8 caracteres")
      .matches(/^\S*$/)
      .withMessage("El nombre de usuario no debe contener espacios.")
      .matches(
        /^(?=.*[A-Za-z].*[A-Za-z].*[A-Za-z].*[A-Za-z].*[A-Za-z])[A-Za-z0-9]*$/
      )
      .withMessage("El nombre de usuario debe contener al menos 5 letras."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("La contraseña debe tener al menos 8 caracteres.")
      .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&#])/)
      .withMessage(
        "La contraseña debe incluir una letra mayúscula, un número y un caracter especial."
      ),
    body("email")
      .isEmail()
      .withMessage("Debes ingresar un email válido")
      .normalizeEmail(),
  ],
  crearUsuario
);
userRouter.post(
  "/ingresar-usuario",
  [
    body("username")
      .not()
      .isEmpty()
      .withMessage("Ingresa tu nombre de usuario"),
    body("password").not().isEmpty().withMessage("La contraseña es requerida"),
  ],
  ingresarUsuario
);
userRouter.post("/cerrar-sesion", cerrarSesion);
userRouter.get("/usuario/:username", authMiddleware, mostrarPerfilPublico);
userRouter.get("/mi-perfil/:userId", authMiddleware, mostrarPerfilPrivado);
userRouter.get(
  "/mis-favoritos/:username",
  authMiddleware,
  mostrarPublicacionesFavoritas
);
userRouter.post("/seguir-usuario", authMiddleware, seguirUsuario);
userRouter.delete(
  "/deseguir-usuario/:userId",
  authMiddleware,
  dejarSeguirUsuario
);
userRouter.put("/modify-bio/:userId", authMiddleware,[
  body("password")
  .isLength({ min: 5, max: 150 })
],modificarBio);
userRouter.get("/post-seguidos/:userId", authMiddleware, mostrarPostSeguidos);
userRouter.get(
  "/mostrar-seguidores/:userId",
  authMiddleware,
  showListadoFollowers
);
userRouter.get(
  "/mostrar-seguidos/:userId",
  authMiddleware,
  showListadoFollowing
);
userRouter.put(
  "/change-avatar/:id",
  [uploadFileMiddleware,authMiddleware],
  cambiarAvatar
);
userRouter.post("/forgot-password", recuperarPassword);
userRouter.put(
  "/recover-password",
  [
    body("password")
      .isLength({ min: 8 })
      .withMessage("La contraseña debe tener al menos 8 caracteres.")
      .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&#])/)
      .withMessage(
        "La contraseña debe incluir una letra mayúscula, un número y un caracter especial."
      ),
  ],
  cambiarPassword
);
userRouter.post("/refresh-token", authMiddleware, refrescarToken);
userRouter.get("/verify", authMiddleware, (req, res) => {
  res.json(req.payload);
});

module.exports = userRouter;
