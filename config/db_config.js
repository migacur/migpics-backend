const mysql = require('mysql2');

const db_config = mysql.createConnection({
    host:process.env.HOST,
    user:process.env.USER,
    password:process.env.PASSWORD,
    database:process.env.DATABASE
});

db_config.connect(function(err) {
  if (err) {
    console.error('Error conectando a: ' + err.stack);
    return;
  }
 
  console.log('Conectado a BBDD con ID ' + db_config.threadId);
});

module.exports = db_config