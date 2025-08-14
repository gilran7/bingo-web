import { getStore } from "@netlify/blobs";
import { jsonResponse, handleOptions, nowMs } from "./_utils.js";

/**
 * Body:
 * { "id": "A1" }
 * - Si está "reservado" y expiró o queremos liberarlo manualmente, lo pasa a "disponible".
 * - Usa CAS para no pisar cambios recientes.
 */
export default async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { id } = await req.json();
    if (!id) return jsonResponse({ error: "Falta id" }, 400);

    const key = `card:${id}`;
    const store = getStore("bingo-cards");

    const current = await store.getWithMetadata(key, { type: "json" });
    if (!current?.data) return jsonResponse({ error: "Cartón no existe" }, 404);

    const now = nowMs();

    if (current.data.status === "vendido") {
      return jsonResponse({ error: "Cartón ya vendido" }, 409);
    }

    // Si estaba reservado pero no expiró y queremos liberar de todas formas, también se permite
    const updated = {
      ...current.data,
      status: "disponible",
      reservedUntil: null,
      reservedBy: null,
      updatedAt: now
    };

    const { modified } = await store.setJSON(key, updated, { onlyIfMatch: current.etag });
    if (!modified) {
      return jsonResponse({ error: "Conflicto de concurrencia. Intenta de nuevo." }, 409);
    }

    return jsonResponse({ ok: true, id });
  } catch (err) {
    return jsonResponse({ error: "Failed to release card", details: String(err?.message || err) }, 500);
  }
};
