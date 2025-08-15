// Importamos el método 'getStore' desde la librería de Netlify Blobs.
const { getStore } = require("@netlify/blobs");

// 'handler' es el nombre estándar para la función principal que Netlify ejecutará.
exports.handler = async (event) => {
  // 1. Verificación inicial: Solo permitimos peticiones de tipo POST.
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // 405 significa "Método no permitido".
      body: JSON.stringify({ error: "Solo se permite el método POST." })
    };
  }

  console.log("Función 'save-cards' invocada. Intentando conectar con el almacén...");

  try {
    // 2. Conexión al Almacén de Blobs.
    // Esta es la línea que fallaba antes. Confiamos en que la nueva configuración
    // en netlify.toml resuelva el problema.
    const store = getStore("cartones-venta");
    console.log("¡Éxito! Conexión con el almacén 'cartones-venta' establecida.");

    // 3. Procesamiento de los datos recibidos.
    const cartones = JSON.parse(event.body);
    if (!Array.isArray(cartones) || cartones.length === 0) {
      return {
        statusCode: 400, // 400 significa "Petición incorrecta".
        body: JSON.stringify({ error: "No se recibieron cartones o el formato es incorrecto." })
      };
    }

    // 4. Lógica de guardado: Iteramos sobre cada cartón y lo guardamos.
    // Usamos Promise.all para que todas las operaciones de guardado se ejecuten en paralelo,
    // lo cual es mucho más eficiente.
    await Promise.all(cartones.map(carton => {
      const idCarton = `carton-${carton.id}`;
      const datosCarton = {
        id: carton.id,
        numeros: carton.matriz, // Guardamos la matriz de números
        status: 'disponible', // Estado inicial
        reservadoHasta: null, // Aún no está reservado
      };
      // Guardamos el objeto como un JSON en el almacén, usando su ID como clave.
      return store.setJSON(idCarton, datosCarton);
    }));

    const mensajeExito = `¡Operación completada! Se guardaron ${cartones.length} cartones exitosamente.`;
    console.log(mensajeExito);

    // 5. Respuesta de éxito.
    return {
      statusCode: 200,
      body: JSON.stringify({ message: mensajeExito }),
    };

  } catch (error) {
    // 6. Manejo de errores detallado.
    // Si algo falla, especialmente la conexión a 'getStore', lo capturamos aquí.
    console.error("--- ERROR CATASTRÓFICO EN 'save-cards' ---");
    console.error("Mensaje de error:", error.message);
    console.error("Stack de error:", error.stack);
    console.error("-----------------------------------------");

    return {
      statusCode: 500, // 500 significa "Error interno del servidor".
      body: JSON.stringify({
        error: "No se pudieron guardar los cartones debido a un fallo interno.",
        details: error.message,
      }),
    };
  }
};