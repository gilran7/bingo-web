import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const { cards } = JSON.parse(event.body || "{}");

    if (!cards) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No se recibieron cartones" })
      };
    }

    const store = getStore({
      name: "bingo-cards",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    });

    await store.set("cards", JSON.stringify(cards));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Cartones guardados con éxito" })
    };

  } catch (error) {
    console.error("Error completo:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
}
