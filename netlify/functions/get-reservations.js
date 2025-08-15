const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
    const NETLIFY_SITE_ID = 'leafy-sfogliatella-494aa1';
    const FORM_ID_RESERVAS = 'reservas-bingo';
    const url = `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms/${FORM_ID_RESERVAS}/submissions`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN}` }
        });
        if (!response.ok) {
            return { statusCode: response.status, body: JSON.stringify({ error: `API Error: ${response.statusText}` }) };
        }
        const submissions = await response.json();
        return { statusCode: 200, body: JSON.stringify(submissions) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Function Error' }) };
    }
};