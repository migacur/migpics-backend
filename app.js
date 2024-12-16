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

// Configuración de CORS
const allowedOrigins = ["http://localhost:3000","https://migpics.onrender.com"];

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

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
