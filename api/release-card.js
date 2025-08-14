import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { cardId } = JSON.parse(event.body);
    const store = getStore("bingo-cards");
    const card = await store.get(cardId, { type: "json" });

    // Solo liberamos cartones que están actualmente reservados
    if (card && card.status === "reservado") {
      const { reservationExpires, ...restOfCard } = card; // Quitamos la propiedad de expiración
      const updatedCard = { ...restOfCard, status: "disponible" };
      await store.setJSON(cardId, updatedCard);
    }
    
    return { statusCode: 200, body: JSON.stringify({ message: "Card released or was already available." }) };

  } catch (error) {
    console.error("Error releasing card:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to release card." }) };
  }
};