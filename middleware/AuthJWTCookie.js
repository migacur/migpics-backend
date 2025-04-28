const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({msg:'Acceso NO autorizado'});
  }

  jwt.verify(token, process.env.TOKEN_KEY, (err, user) => {
    if (err) {
      return res.status(403).send('Prohibido el acceso');
    }
    console.log(`Los datos del usuario logueado son: ${user}`)
    req.payload = user;
    next();
  });
};

module.exports = authMiddleware;
