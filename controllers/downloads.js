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

        if(!imageUrl){
            return res.status(400).json({msg:"NO se encontró la imagen"})
        }
        
        const imageResponse = await axios.get(imageUrl, { 
            responseType: 'stream' 
        });
  
      
        res.setHeader('Content-Disposition', `attachment; filename="${randomUrl}.${ext}"`);
        res.setHeader('Content-Type', imageResponse.headers['content-type']);
  
    
        imageResponse.data.pipe(res);
  
        imageResponse.data.on('end', async () => {
            try {
                await actualizarDescargas(parseInt(postId));
                return res.status(200).json({msg:"Se ha descargado la imagen correctamente"})
            } catch (error) {
                console.error('Error al actualizar descargas:', error);
            }
        });
  
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'Error al descargar la imagen' });
        }
    }
  };

module.exports = {
    descargarImagen
}