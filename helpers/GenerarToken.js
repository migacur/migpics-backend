const jwt = require('jsonwebtoken');

const generarToken = (user) => {
    const secretKeyToken = process.env.TOKEN_KEY;
    const secretKeyTokenRefresh = process.env.TOKEN_KEY_REFRESH;

    const payload = {
        username: user.username,
        id: user.user_id
    };

    const accessToken = jwt.sign(payload, secretKeyToken, {
        expiresIn: '1h'
    });

    const refreshToken = jwt.sign(payload, secretKeyTokenRefresh, {
        expiresIn: '30d'
    });


    return {
        accessToken,
        refreshToken
    }
}

module.exports = generarToken;