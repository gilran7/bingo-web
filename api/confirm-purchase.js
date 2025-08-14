import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { cardId, buyerInfo } = JSON.parse(event.body);
    if (!cardId || !buyerInfo) {
      return { statusCode: 400, body: JSON.stringify({ error: "Card ID and buyer info are required." }) };
    }

    const store = getStore("bingo-cards");
    const card = await store.get(cardId, { type: "json" });

    if (!card) {
      return { statusCode: 404, body: JSON.stringify({ error: "Card not found." }) };
    }
    
    if (card.status !== 'reservado') {
        return { statusCode: 409, body: JSON.stringify({ error: "This card is not reserved for purchase." }) };
    }

    const { reservationExpires, ...restOfCard } = card;
    const updatedCard = {
      ...restOfCard,
      status: "vendido",
      buyerInfo: buyerInfo,
      purchaseDate: new Date().toISOString(),
    };
    
    await store.setJSON(cardId, updatedCard);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Purchase confirmed successfully!" }),
    };

  } catch (error) {
    console.error("Error confirming purchase:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to confirm purchase." }) };
  }
};