import { BlobStore } from "@netlify/blobs";

export async function handler() {
  try {
    const store = new BlobStore({ name: "cartones", siteID: process.env.NETLIFY_BLOBS_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN });

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
