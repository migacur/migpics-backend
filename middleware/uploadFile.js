const multer = require("multer");

// Middleware que detecta la imagen y aplica la configuración
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}.${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    //cb(new Error('Formato No válido'), false);
    req.fileValidationError = 'Formato No válido, solo se permiten archivos .jpeg o .png';
    cb(null, false);
  }
};

const uploadFile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize:  1024 * 100 // 50kb
  }
}).single('file');

const uploadFileMiddleware = (req, res, next) => {
  uploadFile(req, res, function(err) {
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(500)
              .json({ error: 'No se permiten archivos mayores de 100kb' });
      }
      return res.status(500).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: err.message });
    }
    next();
  });
};

module.exports = uploadFileMiddleware;