import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const cards = JSON.parse(event.body);
    if (!Array.isArray(cards) || cards.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No cards provided or invalid format." }),
      };
    }

    // ======================================================
    // INICIO DE LA CORRECCIÓN FINAL
    // Forzamos la conexión a Blobs con las credenciales del entorno
    // ======================================================
    const store = getStore({
        name: "bingo-cards", // El nombre de nuestro almacén
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
    });
    // ======================================================
    // FIN DE LA CORRECCIÓN FINAL
    // ======================================================

    // Borramos todos los cartones anteriores para empezar una nueva partida limpia
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
      body: JSON.stringify({ message: `Successfully stored ${cards.length} new cards.` }),
    };
  } catch (error) {
    console.error("Error saving cards:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to save cards.", details: error.message }),
    };
  }
};