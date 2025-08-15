import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const cards = JSON.parse(event.body);
    if (!Array.isArray(cards) || cards.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No cards provided." }) };
    }

    const store = getStore({
        name: "bingo-cards-venta",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    });

    // Limpiamos el almacén para la nueva venta
    const { blobs } = await store.list();
    for (const blob of blobs) {
      await store.delete(blob.key);
    }

    // Guardamos los nuevos cartones
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
      body: JSON.stringify({ message: `Se han guardado ${cards.length} cartones en el almacén.` }),
    };
  } catch (error) {
    console.error("Error en la función save-cards:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fallo interno en la función.", details: error.message }),
    };
  }
};