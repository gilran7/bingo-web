// netlify/functions/confirm-purchase.js
import { jsonResponse } from "./_utils.js";
import { getStore } from "@netlify/blobs";

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

    if (c.status !== "reservado" || typeof c.reservedUntil !== "number" || c.reservedUntil <= now) {
      return jsonResponse({ error: "Reserva expirada o inexistente" }, 409);
    }

    const updated = {
      ...c,
      status: "vendido",
      reservedUntil: null,
      soldAt: now,
      updatedAt: now
    };

    try {
      await store.setJSON(key, updated, { ifMatch: current.etag });
    } catch {
      return jsonResponse({ error: "Conflicto de concurrencia" }, 409);
    }

    return jsonResponse({ ok: true, id });
  } catch (err) {
    console.error("confirm-purchase error:", err);
    return jsonResponse(
      { error: "Error al confirmar compra", details: err.message },
      500
    );
  }
}
