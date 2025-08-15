import { jsonResponse } from "./_utils.js";
import { createClient } from "@netlify/blobs";

export default async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return jsonResponse({ error: "Método no permitido" }, 405);
    }

    const { cards } = JSON.parse(event.body);

    if (!cards || !Array.isArray(cards)) {
      return jsonResponse({ error: "Formato inválido" }, 400);
    }

    // Conectar a Netlify Blobs
    const client = createClient({
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN,
    });

    const store = client.store("bingo-cards");

    await store.setJSON("cards.json", cards);

    return jsonResponse({ message: "Cartones guardados correctamente" });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error: "Failed to save cards.",
        details: error.message
      },
      500
    );
  }
}
