// netlify/functions/get-available-cards.js
import { jsonResponse } from "./_utils.js";
import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const store = getStore("bingo-cards");
    const { blobs } = await store.list();

    const available = [];
    for (const b of blobs) {
      if (!b.key.startsWith("card:")) continue;
      const c = await store.getJSON(b.key);
      if (c?.status === "disponible") {
        available.push({ id: c.id, numbers: c.numbers });
      }
    }

    return jsonResponse({ ok: true, cards: available });
  } catch (err) {
    console.error("get-available-cards error:", err);
    return jsonResponse(
      { error: "Error al obtener cartones", details: err.message },
      500
    );
  }
}
