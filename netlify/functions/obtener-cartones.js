// CAMBIO CLAVE: Usamos la sintaxis require para importar
const { BlobStore } = require("@netlify/blobs");

exports.handler = async function() {
  try {
    const store = new BlobStore("cartones");

    const data = await store.get("cartones_guardados");
    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No hay cartones guardados" })
      };
    }

    return {
      statusCode: 200,
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}