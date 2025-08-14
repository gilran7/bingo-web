import { getStore } from "@netlify/blobs";

export const handler = async () => {
  try {
    const store = getStore("bingo-cards");
    const { blobs } = await store.list();

    const availableCards = [];
    for (const blob of blobs) {
      const cardData = await store.get(blob.key, { type: "json" });
      if (cardData && cardData.status === "disponible") {
        availableCards.push(cardData);
      }
    }
    
    availableCards.sort((a, b) => a.id - b.id);

    return {
      statusCode: 200,
      body: JSON.stringify(availableCards),
    };
  } catch (error) {
    console.error("Error fetching available cards:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch cards." }),
    };
  }
};