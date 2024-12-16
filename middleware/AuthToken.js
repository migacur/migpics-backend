const { expressjwt } = require("express-jwt");

const secret = process.env.LLAVE_SECRETA;

const authVerifyToken = expressjwt({
    secret,
    algorithms: ["HS256"],
    requestProperty: 'payload',
    getToken: function(req) {
     // const token = req.cookies.token;
     // console.log(token);
        if (req.headers.authorization &&
            req.headers.authorization.split(" ")[0] === "Bearer") {
            const token = req.headers.authorization.split(" ")[1];
            return token;
        }
        return null;
    }
});

module.exports = authVerifyToken;