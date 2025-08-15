import { jsonResponse } from "./_utils.js";
import { createClient } from "@netlify/blobs";

export default async function handler() {
  try {
    const client = createClient({
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN
    });

    const store = client.store("bingo-cards");
    const cardsData = await store.getJSON("cards.json") || [];

    const availableCards = cardsData.filter(card => card.status !== "vendido");

    return jsonResponse({ cards: availableCards });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to fetch cards.", details: error.message }, 500);
  }
}
