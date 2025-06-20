const express = require("express");
const http = require("http");
const socketIo = require('socket.io');
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Configuración del archivo .env
dotenv.config();

const app = express();

// ================== 🛡️ Configuración de Seguridad Mejorada ==================
const allowedOrigins = [
  "http://localhost:3000",
  "https://migpics.onrender.com"
];

// Confía en el proxy de Render.com
app.set("trust proxy", 1);

// Configuración CORS para producción/desarrollo
app.use(cors({
  origin: function (origin, callback) {
    // En desarrollo permite cualquier origen
    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // En producción: validación estricta SIN permitir origin vacío
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`🚨 Intento de acceso desde origen no permitido: ${origin}`);
      callback(new Error("Acceso no autorizado por políticas CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Middlewares esenciales
app.use(cookieParser());
app.use(express.json());

// Middleware de diagnóstico (solo desarrollo)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("🔍 [DEV] Headers recibidos:", req.headers);
    console.log("🍪 Cookies recibidas:", req.cookies);
    next();
  });
}

const server = http.createServer(app);
// Configura Socket.io (permite conexiones desde tu frontend)
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins, // Cambia si tu frontend está en otro puerto
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ------------------
// Maneja conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('✔ Usuario conectado:', socket.id);

  // Cuando un usuario se une a su "sala" personal (para recibir notificaciones)
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`🔔 Usuario ${userId} listo para recibir notifs`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Usuario desconectado:', socket.id);
  });
});

// -----------------

// Importación y uso de rutas
const routers = [
  require("./routes/user"),
  require("./routes/post"),
  require("./routes/likes"),
  require("./routes/top_users"),
  require("./routes/top_posts"),
  require("./routes/downloads"),
  require("./routes/favorites"),
  require("./routes/mensajes"),
  require("./routes/notificaciones")
];

routers.forEach(router => app.use("/api", router)); // 👈 Prefijo /api para todas las rutas

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error("🔥 Error global:", err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" 
      ? "Error interno del servidor" 
      : err.message
  });
});

// Inicio del servidor

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en puerto: ${PORT}`);
  console.log(`🔐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Orígenes permitidos: ${allowedOrigins.join(", ")}`);
});