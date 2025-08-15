const fetch = require('node-fetch');

// Mantenemos las mismas constantes, el FORM_ID que obtendrás seguirá siendo el mismo.
const FORM_ID = 'YOUR_FORM_ID'; // ¡NO OLVIDES REEMPLAZAR ESTO CUANDO LO TENGAS!
const API_TOKEN = process.env.NETLIFY_API_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;

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

    // --- INICIO DE LA LÓGICA DE OPTIMIZACIÓN ---

    // 1. Creamos un identificador único para este lote de cartones.
    //    Usaremos la fecha y hora actual para que sea fácil de identificar.
    const batchId = `lote-${new Date().toISOString()}`;

    // 2. Convertimos el array COMPLETO de cartones en un único string de texto (JSON).
    //    Este es el "paquete" que enviaremos.
    const cartonesData = JSON.stringify(cartones.map(carton => ({
        id: carton.id,
        numeros: carton.matriz, // Usamos la matriz directamente
        status: 'disponible',
        reservadoHasta: null
    })));

    // 3. Preparamos el payload para UN ÚNICO envío.
    //    Los nombres de los campos deben coincidir con los del nuevo formulario fantasma.
    const payload = {
      "form-name": "cartones-disponibles",
      "batchId": batchId,
      "cartonesData": cartonesData,
    };
    
    // 4. Hacemos UNA SOLA llamada a la API de Netlify.
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload).toString()
    });

    if (!response.ok) {
        // Si Netlify da un error, lo mostramos para depurar.
        const errorBody = await response.text();
        console.error('Error de la API de Netlify:', errorBody);
        throw new Error('La API de Netlify respondió con un error.');
    }

    // --- FIN DE LA LÓGICA DE OPTIMIZACIÓN ---

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