require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// 1. Verificación de Variables de Entorno
if (!process.env.DATABASE_URL) {
  console.error("ERROR CATASTRÓFICO: La variable de entorno DATABASE_URL no está definida.");
  process.exit(1);
}

// 2. Configuración
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

// 3. Middleware
app.use(cors(corsOptions));
app.use(express.json());

// 4. RUTAS DE LA API

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor del Bingo funcionando.');
});

// Ruta para obtener cartones disponibles
app.get('/cartones-disponibles', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cartones WHERE status_venta = 'disponible' ORDER BY id ASC");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener cartones:', error);
    res.status(500).json({ error: 'Error interno al obtener cartones.' });
  }
});

// Ruta para guardar un lote de cartones
app.post('/guardar-lote-cartones', async (req, res) => {
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
        console.error('Error al guardar lote:', error);
        res.status(500).json({ error: 'Error interno al guardar el lote.' });
    } finally {
        client.release();
    }
});

// Ruta para reservar un cartón
app.post('/reservar-carton/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const checkQuery = "SELECT * FROM cartones WHERE id = $1 AND status_venta = 'disponible' FOR UPDATE";
        const checkResult = await client.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este cartón ya no está disponible.' });
        }
        const expiracion = new Date();
        expiracion.setHours(expiracion.getHours() + 23);
        const updateQuery = "UPDATE cartones SET status_venta = 'reservado', reservado_hasta = $1 WHERE id = $2";
        await client.query(updateQuery, [expiracion, id]);
        await client.query('COMMIT');
        res.status(200).json({ 
            message: `¡Cartón #${id} reservado con éxito!`,
            reservadoHasta: expiracion.toISOString() 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al reservar cartón #${id}:`, error);
        res.status(500).json({ error: 'Error interno al reservar.' });
    } finally {
        client.release();
    }
});

// Ruta para liberar reservas expiradas
app.post('/liberar-reservas-expiradas', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const requestSecret = req.headers['authorization'];
    if (!cronSecret || `Bearer ${cronSecret}` !== requestSecret) {
        return res.status(401).json({ error: 'Acceso no autorizado.' });
    }
    try {
        const updateQuery = `
            UPDATE cartones 
            SET status_venta = 'disponible', reservado_hasta = NULL 
            WHERE status_venta = 'reservado' AND reservado_hasta < NOW()
            RETURNING id;`;
        const result = await pool.query(updateQuery);
        const numLiberados = result.rowCount;
        const mensaje = `Tarea de limpieza ejecutada. Se liberaron ${numLiberados} cartones expirados.`;
        console.log(mensaje);
        res.status(200).json({ message: mensaje, liberados: numLiberados });
    } catch (error) {
        console.error('Error en la tarea de liberación:', error);
        res.status(500).json({ error: 'Error interno en la tarea de limpieza.' });
    }
});


// 5. Iniciar el Servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado y escuchando en el puerto ${PORT}`);
  console.log(`CORS configurado para origen: ${corsOptions.origin}`);
});