module.exports = (server) => {
    console.log('Inicializando Socket.IO');  // Nuevo log para ver si entra aquí
    const io = require('socket.io')(server);

    io.on('error', (error) => {
      console.log('Socket.IO Error:', error);
    });
   
    io.on("connection", (socket) => {
      console.log("Nuevo cliente conectado");
   
      socket.on("disconnect", () => {
        console.log("Cliente desconectado");
      });
    });
    
    console.log('Socket.IO configurado');  // Para confirmar que la configuración ha terminado
    return io;
  };