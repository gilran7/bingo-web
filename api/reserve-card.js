import { getStore } from "@netlify/blobs";

const RESERVATION_TIME = 5 * 60 * 1000; // 5 minutos en milisegundos

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { cardId } = JSON.parse(event.body);
    if (!cardId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Card ID is required." }) };
    }

    const store = getStore("bingo-cards");
    const card = await store.get(cardId, { type: "json" });

    // Caso 1: El cartón no existe
    if (!card) {
      return { statusCode: 404, body: JSON.stringify({ error: "Card not found." }) };
    }

    // Caso 2: El cartón está vendido
    if (card.status === 'vendido') {
      return { statusCode: 410, body: JSON.stringify({ error: "Este cartón ya fue vendido." }) };
    }

    // Caso 3: El cartón está reservado y la reserva sigue activa
    if (card.status === 'reservado' && card.reservationExpires > Date.now()) {
      return { statusCode: 409, body: JSON.stringify({ error: "Este cartón está siendo reservado por otro usuario. Intenta de nuevo en unos minutos." }) };
    }

    // ¡Éxito! El cartón está disponible o su reserva expiró. Lo reservamos.
    const reservationExpires = Date.now() + RESERVATION_TIME;
    const updatedCard = { ...card, status: "reservado", reservationExpires };
    
    await store.setJSON(cardId, updatedCard);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Card reserved successfully.",
        reservationExpires,
      }),
    };
  } catch (error) {
    console.error("Error reserving card:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to reserve card." }) };
  }
};