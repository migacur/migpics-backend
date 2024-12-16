const randomId = require("random-id");

const generarCodigo =  num => {
    let code =  randomId(num);
    return code;
}

module.exports = generarCodigo;