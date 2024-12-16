const nodemailer = require("nodemailer");

const createTransport = () => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  return transporter;
};

const sendEmailCode = async (userRegister, codigo) => {
  const transporter = createTransport();
  let info = await transporter.sendMail({
    from: "migueljes94@gmail.com",
    to: `${userRegister.email}`,
    subject: "Recupera tu usuario - MigPics!",

    html: `
        <div class="container_email">
        <h1>MigPics!</h1>
        <h2>Código de verificación</h2>
          <h3>Hola ${userRegister.username},</h3>
          <p>Este es tu código de verificación: <strong>${codigo}</strong></p>
          <p>Por favor, utiliza este código para completar el proceso de verificación.</p>
          <p><strong>Recuerda que este código tiene validez por sólo 5 minutos, en caso de caducar debes solicitar otro.</strong></p>
          <p>Atentamente, el administrador de la web MigPics!</p>
        </div>
        `,
  });

  return;
};

module.exports = sendEmailCode;
