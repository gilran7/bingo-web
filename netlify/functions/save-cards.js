// /netlify/functions/save-cards.js
export async function handler(event, context) {
    try {
        const { cards } = JSON.parse(event.body);
        // Aquí guardas los cartones, ejemplo: en un archivo JSON o base de datos
        console.log("Cartones recibidos:", cards);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Cartones guardados con éxito" })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message })
        };
    }
}
