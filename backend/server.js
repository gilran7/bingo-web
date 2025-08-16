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
app.post('/guardar-lote-cartones', async (req, res) => { /* ... (código existente sin cambios) ... */ });
app.get('/cartones-disponibles', async (req, res) => { /* ... (código existente sin cambios) ... */ });

// --- ¡NUEVO ENDPOINT PARA RESERVAR! ---
app.post('/reservar-carton/:id', async (req, res) => {
    // Obtenemos el ID del cartón desde los parámetros de la URL (ej: /reservar-carton/5)
    const { id } = req.params;
    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Buscamos el cartón y nos aseguramos de que esté disponible.
        // "FOR UPDATE" bloquea la fila para evitar que dos personas reserven al mismo tiempo.
        const checkQuery = "SELECT * FROM cartones WHERE id = $1 AND status_venta = 'disponible' FOR UPDATE";
        const checkResult = await client.query(checkQuery, [id]);

        // Si no se encuentra ningún cartón (ya está vendido o reservado), devolvemos un error.
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este cartón ya no está disponible.' }); // 409 Conflict
        }

        // 2. Si está disponible, calculamos la fecha de expiración (23 horas desde ahora).
        const expiracion = new Date();
        expiracion.setHours(expiracion.getHours() + 23);

        // 3. Actualizamos el cartón en la base de datos con el nuevo estado y la fecha de expiración.
        const updateQuery = "UPDATE cartones SET status_venta = 'reservado', reservado_hasta = $1 WHERE id = $2";
        await client.query(updateQuery, [expiracion, id]);

        // 4. Confirmamos la transacción.
        await client.query('COMMIT');
        
        // Enviamos una respuesta de éxito con la fecha de expiración.
        res.status(200).json({ 
            message: `¡Cartón #${id} reservado con éxito!`,
            reservadoHasta: expiracion.toISOString() 
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error(`Error al reservar el cartón #${id}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al intentar reservar.' });
    } finally {
        if (client) client.release();
    }
});


// --- 5. INICIAR EL SERVIDOR (SIN CAMBIOS) ---
app.listen(PORT, () => { /* ... */ });