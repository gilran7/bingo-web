// Usamos la sintaxis require para máxima compatibilidad.
exports.handler = async (event) => {
  // Verificamos que sea un POST, como antes.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Método no permitido' }),
    };
  }

  // ¡NO HACEMOS NADA MÁS! Solo devolvemos un mensaje de éxito.
  try {
    const cards = JSON.parse(event.body);
    const numCards = cards.length;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `¡PRUEBA EXITOSA! La función fue invocada y recibió ${numCards} cartones.` 
      }),
    };
  } catch (error) {
    // Si falla incluso al leer los datos, lo sabremos.
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({
        error: "La función fue invocada, pero los datos enviados no son válidos.",
        details: error.message
      })
    }
  }
};