// netlify/functions/save-cards.js
import { jsonResponse } from "./_utils.js";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    const payload = JSON.parse(event.body || "null");
    const cards = Array.isArray(payload) ? payload : payload?.cards;

    if (!Array.isArray(cards) || cards.length === 0) {
      return jsonResponse({ error: "No se enviaron cartones válidos." }, 400);
    }

    const store = getStore("bingo-cards");

    const results = [];
    for (const raw of cards) {
      const id = String(raw?.id || randomUUID());
      const key = `card:${id}`;
      const card = {
        id,
        numbers: Array.isArray(raw?.numbers) ? raw.numbers : [],
        status: "disponible",
        reservedUntil: null,
        reservedBy: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Crea solo si no existe (evita sobreescrituras accidentales)
      try {
        await store.setJSON(key, card, { ifNoneMatch: "*" });
        results.push({ id, created: true });
      } catch (e) {
        // Si ya existe, lo reportamos sin detener todo el lote
        results.push({ id, created: false, note: "Ya existía" });
      }
    }

    return jsonResponse({ ok: true, results });
  } catch (err) {
    console.error("save-cards error:", err);
    return jsonResponse(
      { error: "Error al guardar cartones", details: err.message },
      500
    );
  }
}
