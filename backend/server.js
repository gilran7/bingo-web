// --- 1. IMPORTACIONES, CONFIGURACIÓN Y MIDDLEWARE (SIN CAMBIOS) ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) { /* ... */ }
const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({ /* ... */ });
const corsOptions = { /* ... */ };
app.use(cors(corsOptions));
app.use(express.json());
console.log(`CORS configurado para permitir el origen: ${corsOptions.origin}`);

// --- 4. RUTAS (ENDPOINTS DE NUESTRA API) ---
app.get('/', (req, res) => { /* ... */ });
app.post('/guardar-lote-cartones', async (req, res) => { /* ... (código existente) ... */ });
app.get('/cartones-disponibles', async (req, res) => { /* ... (código existente) ... */ });
app.post('/reservar-carton/:id', async (req, res) => { /* ... (código existente) ... */ });

// --- ¡NUEVO ENDPOINT PARA LIBERAR RESERVAS! ---
app.post('/liberar-reservas-expiradas', async (req, res) => {
    // Por seguridad, podemos añadir una "clave secreta" para asegurarnos
    // de que solo nuestro Cron Job pueda llamar a este endpoint.
    const cronSecret = process.env.CRON_SECRET;
    const requestSecret = req.headers['authorization'];

    if (!cronSecret || `Bearer ${cronSecret}` !== requestSecret) {
        return res.status(401).json({ error: 'Acceso no autorizado.' }); // 401 Unauthorized
    }

    let client;
    try {
        client = await pool.connect();
        
        // Buscamos todos los cartones que están 'reservados' Y cuya fecha de expiración
        // 'reservado_hasta' es anterior a la hora actual (NOW()).
        const updateQuery = `
            UPDATE cartones 
            SET status_venta = 'disponible', reservado_hasta = NULL 
            WHERE status_venta = 'reservado' AND reservado_hasta < NOW()
            RETURNING id;
        `; // 'RETURNING id' nos devolverá los IDs de los cartones que se liberaron.

        const result = await client.query(updateQuery);
        const numLiberados = result.rowCount; // Contamos cuántas filas fueron afectadas.

        const mensaje = `Tarea de limpieza ejecutada. Se liberaron ${numLiberados} cartones expirados.`;
        console.log(mensaje);
        res.status(200).json({ message: mensaje, liberados: numLiberados });

    } catch (error) {
        console.error('Error en la tarea de liberación de reservas:', error);
        res.status(500).json({ error: 'Error interno del servidor al ejecutar la tarea de limpieza.' });
    } finally {
        if (client) client.release();
    }
});


// --- 5. INICIAR EL SERVIDOR (SIN CAMBIOS) ---
app.listen(PORT, () => { /* ... */ });