import { getStore } from "@netlify/blobs";
import { jsonResponse, handleOptions, nowMs } from "./_utils.js";

/**
 * Espera body:
 * { "id": "A1", "by": "cliente-optional" }
 * - Reserva 23 horas. Si ya está reservado (y no expiró) o vendido, rechaza.
 * - Usa CAS con ETag para evitar “pisadas”.
 */
export default async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { id, by } = await req.json();
    if (!id) return jsonResponse({ error: "Falta id" }, 400);

    const key = `card:${id}`;
    const store = getStore("bingo-cards");

    // Leemos con metadata para obtener el ETag actual
    const current = await store.getWithMetadata(key, { type: "json" });
    if (!current?.data) return jsonResponse({ error: "Cartón no existe" }, 404);

    const now = nowMs();
    const expiresAt = now + 23 * 60 * 60 * 1000;

    // Si estaba reservado y no expiró, no se puede reservar
    if (current.data.status === "reservado" &&
        current.data.reservedUntil &&
        current.data.reservedUntil > now) {
      return jsonResponse({ error: "Cartón ya reservado" }, 409);
    }

    if (current.data.status === "vendido") {
      return jsonResponse({ error: "Cartón ya vendido" }, 409);
    }

    // Preparamos nuevo estado
    const updated = {
      ...current.data,
      status: "reservado",
      reservedUntil: expiresAt,
      reservedBy: by || null,
      updatedAt: now
    };

    // Escritura condicional: solo si ETag no cambió (evita carreras)
    const { modified } = await store.setJSON(key, updated, { onlyIfMatch: current.etag });
    if (!modified) {
      return jsonResponse({ error: "Conflicto de concurrencia. Intenta de nuevo." }, 409);
    }

    return jsonResponse({ ok: true, id, reservedUntil: expiresAt });
  } catch (err) {
    return jsonResponse({ error: "Failed to reserve card", details: String(err?.message || err) }, 500);
  }
};
