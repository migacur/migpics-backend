const jwt = require('jsonwebtoken');
const verificarRefreshTokenEnBD = require('../helpers/verificarRefreshToken');
const generarToken = require('../helpers/GenerarToken');
/*
const authMiddleware = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({msg:'Acceso NO autorizado'});
  }

  jwt.verify(token, process.env.TOKEN_KEY, (err, user) => {
    if (err) {
      console.log(err)
      return res.status(403).send('Prohibido el acceso');
    }
    console.log(`[${new Date().toISOString()}] Usuario autenticado:`, user);
    req.payload = user;
    next();
  });
}; */

const authMiddleware = async (req, res, next) => {
  // Obtener tokens de las cookies
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

  // Si no hay access token pero hay refresh token: renovar
  if (!accessToken && refreshToken) {
    try {
      // Verificar refresh token en base de datos
      const user = await verificarRefreshTokenEnBD(refreshToken); // <-- Tu función de BD
      
      // Generar nuevo access token
      const newAccessToken = generarToken(user); // <-- Tu función JWT
      
      // Enviar nuevo access token en cookies
      res.cookie("access_token", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 15 * 60 * 1000, // 15 minutos
        path: "/"
      });
      
      req.payload = user;
      return next();
    } catch (error) {
      // Refresh token inválido: limpiar cookies
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      return res.status(401).json({ msg: "Sesión expirada" });
    }
  }

  // Verificar access token existente
  if (accessToken) {
    jwt.verify(accessToken, process.env.TOKEN_KEY, (err, user) => {
      if (err) {
        // Token expirado o inválido: intentar con refresh token
        if (err.name === "TokenExpiredError" && refreshToken) {
          // Aquí podrías manejar la renovación automática si prefieres
          return res.status(401).json({ msg: "Token expirado" });
        }
        return res.status(403).send('Acceso prohibido');
      }
      req.payload = user;
      next();
    });
  } else {
    res.status(401).json({ msg: "No autenticado" });
  }
};

module.exports = authMiddleware;
