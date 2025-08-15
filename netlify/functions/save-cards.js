const fetch = require('node-fetch');

// ID del formulario que Netlify creará. Debe coincidir con el 'name' del form en tu HTML.
const FORM_ID = 'YOUR_FORM_ID'; // ¡REEMPLAZA ESTO EN EL SIGUIENTE PASO!
const API_TOKEN = process.env.NETLIFY_API_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID; // Netlify provee esta variable automáticamente

const API_ENDPOINT = `https://api.netlify.com/api/v1/sites/${SITE_ID}/submissions`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const cartones = JSON.parse(event.body);
    if (!Array.isArray(cartones) || cartones.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No se recibieron cartones.' }) };
    }

    // Primero, borramos todos los cartones viejos para empezar de cero
    // (Esta parte la implementaremos si es necesaria, por ahora nos enfocamos en guardar)

    // Enviamos cada cartón como un "submission" de formulario
    const promesasDeEnvio = cartones.map(carton => {
      const payload = {
        "form-name": "cartones-disponibles",
        "id": carton.id.toString(),
        "numeros": JSON.stringify(carton.matriz),
        "status": "disponible"
      };
      
      return fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(payload).toString()
      });
    });

    await Promise.all(promesasDeEnvio);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Éxito! Se han guardado ${cartones.length} cartones.` })
    };
  } catch (error) {
    console.error('Error en save-cards:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fallo al guardar los cartones.', details: error.message })
    };
  }
};