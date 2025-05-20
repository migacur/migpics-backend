const jwt = require('jsonwebtoken');

const generarOnlyToken = (user) => {

    const payload = {
        username: user.username,
        id: user.user_id
    };

  return jwt.sign(
    payload,
    process.env.TOKEN_KEY,
    { expiresIn: "1h" }
  );
};

module.exports = generarOnlyToken;