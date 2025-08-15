const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const cards = JSON.parse(event.body);
    if (!Array.isArray(cards) || cards.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No se proporcionaron cartones." }) };
    }

    // CAMBIO CRÍTICO: Usamos la conexión explícita con nuestras variables de entorno.
    const store = getStore({
        name: "cartones-venta",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    });

    const { blobs } = await store.list();
    for (const blob of blobs) {
      await store.delete(blob.key);
    }

    for (const card of cards) {
      const cardId = `card-${card.id}`;
      const cardData = {
        id: card.id,
        numbers: card.numbers,
        status: "disponible",
      };
      await store.setJSON(cardId, cardData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Éxito! Se han guardado ${cards.length} cartones para la venta.` }),
    };
  } catch (error) {
    console.error("Error en save-cards:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fallo interno en la función al guardar.", details: error.message }),
    };
  }
};