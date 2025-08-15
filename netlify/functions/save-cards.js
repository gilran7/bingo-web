import { getStore } from "@netlify/blobs";
import { jsonResponse } from "./_utils.js";

export async function handler(event) {
  try {
    const { cards } = JSON.parse(event.body);
    const store = getStore("bingo-cards");
    await store.set("cards", JSON.stringify(cards));
    return jsonResponse({ message: "Cartones guardados con éxito" });
  } catch (error) {
    console.error("Error en save-cards.js:", error); // Para verlo en el log de Netlify
    return jsonResponse({ error: error.message || error.toString() }, 500);
  }
}