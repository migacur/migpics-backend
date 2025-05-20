const jwt = require('jsonwebtoken');

const generarOnlyToken = (user) => {
   console.log("--- TOKEN ONLY ---")
   console.log(user)
   console.log("--- TOKEN ONLY ---")
   const { username, user_id } = user;

   const payload = {
    username:username,
    id:user_id
   }
  
  return jwt.sign(
    payload,
    process.env.TOKEN_KEY,
    { expiresIn: "1h" }
  );
};

module.exports = generarOnlyToken;