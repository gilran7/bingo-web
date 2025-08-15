const fetch = require('node-fetch');

// YA NO NECESITAMOS EL FORM_ID MANUAL. ¡MÁS ROBUSTO!
const API_TOKEN = process.env.NETLIFY_API_TOKEN;
const SITE_ID = process.env.SITE_ID; // Netlify inyecta esta variable automáticamente

// Usaremos el endpoint general del sitio, que es más fiable.
const API_ENDPOINT = `https://api.netlify.com/api/v1/sites/${SITE_ID}/submissions`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Nos aseguramos de que las variables de entorno están cargadas.
    if (!API_TOKEN || !SITE_ID) {
      throw new Error("Las variables de entorno API_TOKEN o SITE_ID no están configuradas.");
    }

    const cartones = JSON.parse(event.body);
    if (!Array.isArray(cartones) || cartones.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No se recibieron cartones.' }) };
    }

    const batchId = `lote-${new Date().toISOString()}`;
    const cartonesData = JSON.stringify(cartones.map(carton => ({
        id: carton.id,
        numeros: carton.matriz,
        status: 'disponible',
        reservadoHasta: null
    })));

    const payload = {
      // Es crucial que 'form-name' coincida con el nombre del formulario fantasma.
      "form-name": "cartones-disponibles",
      "batchId": batchId,
      "cartonesData": cartonesData,
    };
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload).toString()
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error de la API de Netlify:', response.status, errorBody);
        throw new Error('La API de Netlify respondió con un error.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Éxito masivo! Se guardaron ${cartones.length} cartones en un solo lote.` })
    };
  } catch (error) {
    console.error('Error en save-cards (versión final):', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fallo al guardar el lote de cartones.', details: error.message })
    };
  }
};