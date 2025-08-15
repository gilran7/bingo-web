const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    // Nos conectamos al mismo almacén donde guardamos los cartones
    const store = getStore("cartones-venta");

    // Obtenemos la lista de todos los cartones guardados
    const { blobs } = await store.list();

    const availableCards = [];
    for (const blob of blobs) {
      // Pedimos cada cartón como un objeto JSON
      const cardData = await store.get(blob.key, { type: "json" });
      
      // Solo nos interesan los que están disponibles para la venta
      if (cardData && cardData.status === 'disponible') {
        availableCards.push(cardData);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(availableCards),
    };
  } catch (error) {
    console.error("Error en obtener-cartones:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudieron obtener los cartones.", details: error.message }),
    };
  }
};