import { getStore } from "@netlify/blobs";
import { jsonResponse } from "./_utils.js";

export async function handler(event) {
  try {
    const { cards } = JSON.parse(event.body);

    const store = getStore({
      name: "bingo-cards",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    });

    await store.set("cards", JSON.stringify(cards));

    return jsonResponse({ message: "Cartones guardados con éxito" });
  } catch (error) {
    console.error("Error en save-cards.js:", error);
    return jsonResponse({ error: error.message || error.toString() }, 500);
  }
}
