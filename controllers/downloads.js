const { request, response } = require("express");
const axios = require('axios');
const actualizarDescargas = require("../helpers/updateDownloads");
const { v4: uuidv4 } = require('uuid');

const descargarImagen = async (req = request, res = response) => {
  const { postId } = req.params;
  const randomUrl = uuidv4();

  try {
      const imageUrl = req.body.url;
      const ext = imageUrl.split('.').pop();
      
      // Obtener la imagen directamente
      const imageResponse = await axios.get(imageUrl, { 
          responseType: 'stream' 
      });

      // Configurar headers para forzar la descarga
      res.setHeader('Content-Disposition', `attachment; filename="${randomUrl}.${ext}"`);
      res.setHeader('Content-Type', imageResponse.headers['content-type']);

      // Pipe de la imagen desde la respuesta de axios al cliente
      imageResponse.data.pipe(res);

      actualizarDescargas(postId);

  } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: 'Error al descargar la imagen' });
  }
};


module.exports = {
    descargarImagen
}