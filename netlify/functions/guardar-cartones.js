import { BlobStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const data = JSON.parse(event.body);
    const store = new BlobStore({ name: "cartones", siteID: process.env.NETLIFY_BLOBS_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN });

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
