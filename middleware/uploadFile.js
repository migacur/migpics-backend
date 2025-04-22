const multer = require("multer");

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) { // Más flexible
    cb(null, true);
  } else {
    req.fileValidationError = "Formato no válido. Solo imágenes (JPEG/PNG)";
    cb(null, false);
  }
};

// Configuración para producción y desarrollo
const uploadFile = multer({
  storage: multer.memoryStorage(), // ¡Clave! Archivo en memoria
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (ajusta según necesites)
  },
}).single("file"); // Asegúrate que coincida con el campo del frontend

const uploadFileMiddleware = (req, res, next) => {
  uploadFile(req, res, (err) => {
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "El archivo excede el tamaño máximo (5MB)" });
      }
      return res.status(500).json({ error: "Error al procesar el archivo" });
    }
    next();
  });
};

module.exports = uploadFileMiddleware;