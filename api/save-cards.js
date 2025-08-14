import { getStore } from "@netlify/blobs";
import { jsonResponse, handleOptions } from "./_utils.js";

/**
 * Espera un body JSON:
 * {
 *   "cards": [
 *     { "id": "A1", "numbers": [... 24 ó 25 ...] },
 *     ...
 *   ]
 * }
 * Cada cartón se guarda como key: "card:<id>"
 * Estado inicial: "disponible"
 */
export default async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { cards } = await req.json();
    if (!Array.isArray(cards) || cards.length === 0) {
      return jsonResponse({ error: "No se recibieron cartones válidos." }, 400);
    }

    // IMPORTANTE: getStore dentro del handler
    const store = getStore("bingo-cards");

    const results = [];
    for (const raw of cards) {
      const id = String(raw.id || "").trim();
      if (!id) {
        results.push({ id: null, ok: false, error: "Falta id" });
        continue;
      }
      const key = `card:${id}`;

      // onlyIfNew evita sobreescribir accidentalmente
      const initial = {
        id,
        numbers: raw.numbers || [],
        status: "disponible",
        reservedUntil: null,
        reservedBy: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const { modified } = await store.setJSON(key, initial, { onlyIfNew: true });
      if (modified) {
        results.push({ id, ok: true, created: true });
      } else {
        // Ya existía: no lo sobreescribimos
        results.push({ id, ok: true, created: false });
      }
    }

    return jsonResponse({ ok: true, results });
  } catch (err) {
    return jsonResponse({
      error: "Failed to save cards.",
      details: String(err?.message || err)
    }, 500);
  }
};
