import { getStore } from "@netlify/blobs";
import { jsonResponse, handleOptions, nowMs } from "./_utils.js";

/**
 * Devuelve solo cartones disponibles.
 * También “barre” reservas expiradas (23h) al momento de listar.
 */
export default async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const store = getStore("bingo-cards");

    // Listamos todas las keys; si en el futuro fueran miles, añadiremos paging/prefix.
    const { blobs } = await store.list();
    const now = nowMs();

    const available = [];
    for (const b of blobs) {
      if (!b.key.startsWith("card:")) continue;
      const card = await store.getJSON(b.key);
      if (!card) continue;

      // Si está reservado pero expirado, lo liberamos en caliente.
      if (card.status === "reservado" && card.reservedUntil && card.reservedUntil <= now) {
        card.status = "disponible";
        card.reservedUntil = null;
        card.reservedBy = null;
        card.updatedAt = now;
        await store.setJSON(b.key, card);
      }

      if (card.status === "disponible") {
        available.push({
          id: card.id,
          numbers: card.numbers
        });
      }
    }

    return jsonResponse({ ok: true, cards: available });
  } catch (err) {
    return jsonResponse({ error: "Failed to read available cards", details: String(err?.message || err) }, 500);
  }
};
