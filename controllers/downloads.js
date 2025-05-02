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
        
        // Obtener la imagen
        const imageResponse = await axios.get(imageUrl, { 
            responseType: 'stream' 
        });
  
        // Configurar headers
        res.setHeader('Content-Disposition', `attachment; filename="${randomUrl}.${ext}"`);
        res.setHeader('Content-Type', imageResponse.headers['content-type']);
  
        // Pipe de la imagen
        imageResponse.data.pipe(res);
  
        // Actualizar descargas después de que el pipe finalice
        imageResponse.data.on('end', async () => {
            try {
                await actualizarDescargas(postId); // <--- Asegurar que actualizarDescargas use promesas
            } catch (error) {
                console.error('Error al actualizar descargas:', error);
            }
        });
  
    } catch (error) {
        console.error(error);
        if (!res.headersSent) { // Verificar si la respuesta no se ha enviado
            res.status(500).json({ msg: 'Error al descargar la imagen' });
        }
    }
  };

module.exports = {
    descargarImagen
}