const { request, response } = require("express");
const fs = require('fs');
const axios = require('axios');
const os = require('os');
const path = require('path');
const actualizarDescargas = require("../helpers/updateDownloads");
const { v4: uuidv4 } = require('uuid');

const descargarImagen = async (req=request,res=response) => {

    const { postId } = req.params;
    const randomUrl = uuidv4();

    try {
        const imageUrl = req.body.url; // Obtén la URL de la imagen desde la solicitud del cliente
        const ext = imageUrl.split('.').pop();
        const imageResponse  = await axios.get(imageUrl, { responseType: 'stream' }); // Realiza una solicitud HTTP para obtener la imagen
    
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const imagePath = path.join(desktopPath, `${randomUrl}.${ext}`);// Define la ruta donde deseas guardar la imagen
    
        imageResponse.data.pipe(fs.createWriteStream(imagePath)); // Guarda la imagen en el disco
    
        actualizarDescargas(postId)
        return res.status(200).json({ msg: 'La imagen se ha descargado exitosamente' });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al descargar la imagen' });
      } 


}


module.exports = {
    descargarImagen
}