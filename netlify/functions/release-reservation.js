const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { submission_id } = JSON.parse(event.body);
    const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
    if (!submission_id) {
        return { statusCode: 400, body: 'Missing submission_id' };
    }
    const url = `https://api.netlify.com/api/v1/submissions/${submission_id}`;
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN}` }
        });
        // Netlify devuelve 204 en éxito, así que lo pasamos tal cual
        return { statusCode: response.status }; 
    } catch (error) {
        return { statusCode: 500, body: 'Function Error' };
    }
};