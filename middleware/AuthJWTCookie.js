const jwt = require('jsonwebtoken');
//const verificarRefreshTokenEnBD = require('../helpers/verificarRefreshToken');
//const generarToken = require('../helpers/GenerarToken');
const generarOnlyToken = require('../helpers/generarOnlyToken');
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
/*
const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

  const handleUnauthorized = (msg = "Sesión expirada") => {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return res.status(401).json({ msg });
  };

  try {
    // 1. Verificar accessToken si existe
    if (accessToken) {
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(accessToken, process.env.TOKEN_KEY, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      req.payload = decoded;
      return next();
    }

    // 2. Si no hay accessToken pero hay refreshToken
    if (refreshToken) {
      const user = await verificarRefreshTokenEnBD(refreshToken);
      const newAccessToken = generarToken(user);

      res.cookie("access_token", newAccessToken.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 15 * 60 * 1000,
        path: "/",
      });

      req.payload = user;
      return next();
    }

    // 3. Si no hay ningún token
    return handleUnauthorized("No autenticado");

  } catch (err) {
    // Manejo de errores
    if (err.name === "TokenExpiredError" && refreshToken) {
      try {
        const user = await verificarRefreshTokenEnBD(refreshToken);
        const newAccessToken = generarToken(user);

        res.cookie("access_token", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 15 * 60 * 1000,
          path: "/",
        });

        req.payload = user;
        return next();
      } catch (error) {
        return handleUnauthorized();
      }
    }
    return res.status(403).send('Acceso prohibido');
  }
};
*/
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
