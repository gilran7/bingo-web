require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL no está definida.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const corsOptions = {
  origin: 'https://bingo-frontend-4h3h.onrender.com',
  optionsSuccessStatus: 200
};
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors(corsOptions));

// RUTAS DE LA API

app.get('/', (req, res) => res.send('Servidor del Bingo funcionando.'));

app.get('/todos-los-cartones', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM cartones ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener todos los cartones.' });
    }
});

app.post('/guardar-lote-cartones', express.json(), async (req, res) => {
    const cartones = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM cartones');
        for (const carton of cartones) {
            const query = 'INSERT INTO cartones (id, numeros, status_venta, esta_activo) VALUES ($1, $2, $3, $4)';
            const values = [carton.id, JSON.stringify(carton.numbers), 'disponible', false];
            await client.query(query, values);
        }
        await client.query('COMMIT');
        res.status(200).json({ message: `¡Lote de ${cartones.length} cartones guardado con éxito!` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al guardar el lote.' });
    } finally {
        client.release();
    }
});

app.post('/reservar-carton/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const checkQuery = "SELECT status_venta FROM cartones WHERE id = $1 FOR UPDATE";
        const checkResult = await client.query(checkQuery, [id]);
        if (checkResult.rows.length === 0 || checkResult.rows[0].status_venta !== 'disponible') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este cartón ya no está disponible.' });
        }
        const updateQuery = "UPDATE cartones SET status_venta = 'reservado', reservado_hasta = NULL WHERE id = $1";
        await client.query(updateQuery, [id]);
        await client.query('COMMIT');
        res.status(200).json({ message: `¡Cartón #${id} reservado con éxito!` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error interno al reservar.' });
    } finally {
        client.release();
    }
});

// --- ¡NUEVA RUTA AÑADIDA! ---
app.post('/resetear-venta', express.json(), async (req, res) => {
    try {
        const query = `UPDATE cartones SET status_venta = 'disponible', esta_activo = false, reservado_hasta = NULL`;
        await pool.query(query);
        res.status(200).json({ message: '¡Todos los cartones han sido puestos a la venta!' });
    } catch (error) {
        console.error('Error al resetear la venta:', error);
        res.status(500).json({ error: 'Error interno al resetear la venta.' });
    }
});


// (Aquí van el resto de tus rutas: /confirmar-compra, /liberar-reserva, etc. que ya funcionan)

// Iniciar el Servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado y escuchando en el puerto ${PORT}`);
  console.log(`CORS configurado para origen: ${corsOptions.origin}`);
});