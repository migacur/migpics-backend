const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Configuración del archivo .env
dotenv.config();

const app = express();

// Importación de rutas
const userRouter = require("./routes/user");
const postRouter = require("./routes/post");
const likeRouter = require("./routes/likes");
const TopUserRouter = require("./routes/top_users");
const TopPostRouter = require("./routes/top_posts");
const downloadRouter = require("./routes/downloads");
const favRouter = require("./routes/favorites");
const msgRouter = require("./routes/mensajes");
const notificacionesRouter = require("./routes/notificaciones");

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Configuración del middleware
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// Uso de rutas
app.use(userRouter);
app.use(postRouter);
app.use(likeRouter);
app.use(TopUserRouter);
app.use(TopPostRouter);
app.use(downloadRouter);
app.use(favRouter);
app.use(msgRouter);
app.use(notificacionesRouter);

const server = http.createServer(app);
//require('./config/socket')(server); 
// Inicio del servidor
server.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto: ${PORT}`);
});
