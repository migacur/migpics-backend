const express = require("express");
const http = require("http");
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

// Configuración CORS para producción/desarrollo
app.use(cors({
  origin: function (origin, callback) {
    // En desarrollo permite cualquier origen (útil para pruebas locales)
    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // En producción: validación estricta
    if (!origin || allowedOrigins.includes(origin)) {
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

app.set("trust proxy", 1); // Necesario para cookies en entornos cloud

// ================================================================

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
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en puerto: ${PORT}`);
  console.log(`🔐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Orígenes permitidos: ${allowedOrigins.join(", ")}`);
});