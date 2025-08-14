// netlify/functions/release-card.js
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

    // Si ya está disponible o vendido, no hacemos nada destructivo
    if (c.status === "vendido") {
      return jsonResponse({ ok: true, id, message: "Cartón ya vendido (no se libera)" });
    }
    if (c.status === "disponible") {
      return jsonResponse({ ok: true, id, message: "Cartón ya estaba disponible" });
    }

    // Estaba reservado: lo liberamos si venció o si el usuario cancela
    const updated = {
      ...c,
      status: "disponible",
      reservedUntil: null,
      updatedAt: now
    };

    try {
      await store.setJSON(key, updated, { ifMatch: current.etag });
    } catch {
      return jsonResponse({ error: "Conflicto de concurrencia" }, 409);
    }

    return jsonResponse({ ok: true, id });
  } catch (err) {
    console.error("release-card error:", err);
    return jsonResponse(
      { error: "Error al liberar cartón", details: err.message },
      500
    );
  }
}
