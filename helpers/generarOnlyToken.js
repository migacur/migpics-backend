const jwt = require('jsonwebtoken');

const generarOnlyToken = (user) => {
  console.log("--- TOKEN ONLY ---");
  console.log(user);
  console.log("--- TOKEN ONLY ---");
  const { username, id } = user; 

  const payload = {
    username,
    id,
  };

  return jwt.sign(payload, process.env.TOKEN_KEY, { expiresIn: "1h" });
};

module.exports = generarOnlyToken;