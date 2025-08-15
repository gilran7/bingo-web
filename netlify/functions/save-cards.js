const fetch = require('node-fetch');

// ¡HEMOS REEMPLAZADO EL ID POR TI!
const FORM_ID = '689fb924be029b007b6c7e8';
const API_TOKEN = process.env.NETLIFY_API_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;

// AHORA LA URL ES CORRECTA Y COMPLETA
const API_ENDPOINT = `https://api.netlify.com/api/v1/forms/${FORM_ID}/submissions`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
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
        console.error('Error de la API de Netlify:', errorBody);
        throw new Error('La API de Netlify respondió con un error.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Éxito masivo! Se guardaron ${cartones.length} cartones en un solo lote.` })
    };
  } catch (error) {
    console.error('Error en save-cards (versión masiva):', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fallo al guardar el lote de cartones.', details: error.message })
    };
  }
};