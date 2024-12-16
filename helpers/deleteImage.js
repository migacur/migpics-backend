// Importa el módulo de Cloudinary
const cloudinary = require('cloudinary').v2;

// Función para eliminar una imagen de Cloudinary
const eliminarImagenCloudinary = async (imagen) => {
  try {
    // Extrae el public_id de la URL de la imagen
    const publicId = cloudinary.url(imagen).split('/').pop().split('.')[0];

    // Elimina la imagen de Cloudinary
    const resultado = await cloudinary.uploader.destroy(publicId);
    console.log('Se eliminó la imagen')
    console.log(resultado);
  } catch (error) {
    console.log('Error al eliminar la imagen de Cloudinary:', error);
  }
};

module.exports = eliminarImagenCloudinary;