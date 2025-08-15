const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const cards = JSON.parse(event.body);
    if (!Array.isArray(cards) || cards.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No se proporcionaron cartones." }) };
    }

    // Usamos el almacén correcto
    const store = getStore("cartones-venta");

    // Limpiamos los cartones de la venta anterior
    const { blobs } = await store.list();
    for (const blob of blobs) {
      await store.delete(blob.key);
    }

    // Guardamos los nuevos cartones
    for (const card of cards) {
      const cardId = `card-${card.id}`;
      const cardData = {
        id: card.id,
        numbers: card.numbers, // 'numbers' contiene la matriz
        status: "disponible", // Estado inicial
      };
      await store.setJSON(cardId, cardData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Éxito! Se han guardado ${cards.length} cartones para la venta.` }),
    };
  } catch (error) {
    console.error("Error en save-cards:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fallo interno en la función al guardar.", details: error.message }),
    };
  }
};