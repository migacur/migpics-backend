const jwt = require('jsonwebtoken');

const generarOnlyToken = (user) => {
  return jwt.sign(
    { username: user.username, id: user.user_id },
    process.env.TOKEN_KEY,
    { expiresIn: "15m" }
  );
};

module.exports = generarOnlyToken;