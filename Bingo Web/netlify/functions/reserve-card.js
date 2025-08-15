// netlify/functions/reserve-card.js
import { jsonResponse } from "./_utils.js";
import { getStore } from "@netlify/blobs";

const RESERVE_MS = 23 * 60 * 60 * 1000;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    const { id } = JSON.parse(event.body || "{}");
    if (!id) return jsonResponse({ error: "Falta el id del cartón" }, 400);

    const store = getStore("bingo-cards");
    const key = `card:${id}`;

    const current = await store.getWithMetadata(key, { type: "json" });
    if (!current?.data) {
      return jsonResponse({ error: "Cartón no existe" }, 404);
    }

    const now = Date.now();
    const c = current.data;

    if (c.status === "vendido") {
      return jsonResponse({ error: "Cartón ya vendido" }, 409);
    }

    if (c.status === "reservado" && typeof c.reservedUntil === "number" && c.reservedUntil > now) {
      return jsonResponse({ error: "Cartón ya reservado" }, 409);
    }

    const updated = {
      ...c,
      status: "reservado",
      reservedUntil: now + RESERVE_MS,
      updatedAt: now
    };

    // Escritura condicional: solo si nadie lo cambió entre la lectura y ahora
    try {
      await store.setJSON(key, updated, { ifMatch: current.etag });
    } catch (e) {
      return jsonResponse({ error: "Conflicto de concurrencia" }, 409);
    }

    return jsonResponse({ ok: true, id, reservedUntil: updated.reservedUntil });
  } catch (err) {
    console.error("reserve-card error:", err);
    return jsonResponse(
      { error: "Error al reservar cartón", details: err.message },
      500
    );
  }
}
