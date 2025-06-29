const jwt = require('jsonwebtoken');
const generarOnlyToken = require('../helpers/generarOnlyToken');

const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

  const handleUnauthorized = (msg = "Sesión expirada") => {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return res.status(401).json({ msg });
  };

  // Verificar accessToken
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.TOKEN_KEY);
      console.log("--- DECODED ACCESS ---")
      console.log(decoded)
      console.log("--- DECODED ACCESS ---")
      req.payload = decoded;
      return next();
    } catch (err) {
      if (err.name !== "TokenExpiredError") {
        return handleUnauthorized("Token inválido");
      }
    }
  }

  // Si el accessToken está expirado o no existe, verificar refreshToken
  if (refreshToken) {
    try {
      // Verificar JWT del refreshToken (sin BD)
      const decodedRefresh = jwt.verify(refreshToken, process.env.TOKEN_KEY_REFRESH);
      console.log("--- DECODED REFRESH ---")
      console.log(decodedRefresh)
      console.log("--- DECODED REFRESH ---")
      // Generar nuevo accessToken
      const newAccessToken = generarOnlyToken(decodedRefresh);
      
      res.cookie("access_token", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 60 * 60 * 1000, // 1 hora
        path: "/",
      });

      req.payload = decodedRefresh;
      return next();
    } catch (error) {
      return handleUnauthorized();
    }
  }

  return handleUnauthorized("No autenticado");
};

module.exports = authMiddleware;
