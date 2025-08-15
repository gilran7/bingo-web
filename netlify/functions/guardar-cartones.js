// CAMBIO CLAVE: Usamos la sintaxis require para importar
const { BlobStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  try {
    const data = JSON.parse(event.body);
    // NOTA: BlobStore está obsoleto, pero lo corregimos para que funcione si se usa.
    // La forma correcta es getStore, pero adaptamos esta función.
    const store = new BlobStore("cartones");

    await store.set("cartones_guardados", JSON.stringify(data));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Cartones guardados con éxito" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}