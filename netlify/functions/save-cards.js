import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  // 1. Añadimos un log para ver el evento completo en Netlify.
  console.log("Función save-cards invocada.");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido." }),
    };
  }

  // Usamos un bloque try/catch general para cualquier error inesperado.
  try {
    // 2. Logueamos el cuerpo (body) para verificar qué datos estamos recibiendo.
    console.log("Cuerpo recibido:", event.body);
    
    const cards = JSON.parse(event.body);

    if (!Array.isArray(cards) || cards.length === 0) {
      console.error("Error: No se proporcionaron cartones o el formato no es un array.");
      return { statusCode: 400, body: JSON.stringify({ error: "No se proporcionaron cartones válidos." }) };
    }

    console.log(`Iniciando guardado de ${cards.length} cartones.`);
    
    // La conexión a la tienda también puede fallar, la mantenemos dentro del try.
    const store = getStore("cartones-venta");
    
    console.log("Conexión con el almacén 'cartones-venta' exitosa.");

    // Limpieza de cartones anteriores
    const { blobs } = await store.list();
    console.log(`Encontrados ${blobs.length} cartones antiguos para borrar.`);
    for (const blob of blobs) {
      await store.delete(blob.key);
    }
    console.log("Limpieza de cartones antiguos completada.");

    // Guardado de los nuevos cartones
    for (const card of cards) {
      const cardId = `card-${card.id}`;
      const cardData = {
        id: card.id,
        numbers: card.numbers, // 'numbers' contiene la matriz
        status: "disponible",
        timestamp: null,
      };
      await store.setJSON(cardId, cardData);
    }
    
    console.log("Todos los cartones nuevos han sido guardados exitosamente.");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Éxito! Se guardaron ${cards.length} cartones para la venta.` }),
    };

  } catch (error) {
    // 3. Este es el cambio más importante. Logueamos el error DETALLADO en el servidor.
    console.error("¡ERROR FATAL DENTRO DE SAVE-CARDS!:", error);
    
    // Y devolvemos un JSON con el mensaje de error para que el frontend pueda mostrarlo.
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Hubo un fallo en el servidor al procesar los cartones.", 
        details: error.message // Enviamos el mensaje de error real al frontend.
      }),
    };
  }
};