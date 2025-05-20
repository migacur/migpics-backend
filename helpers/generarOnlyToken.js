const jwt = require('jsonwebtoken');

const generarOnlyToken = (user) => {
   console.log("--- TOKEN ONLY ---")
   console.log(user)
   console.log("--- TOKEN ONLY ---")
  
  return jwt.sign(
    user,
    process.env.TOKEN_KEY,
    { expiresIn: "1h" }
  );
};

module.exports = generarOnlyToken;