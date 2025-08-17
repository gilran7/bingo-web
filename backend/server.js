require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');

// 1. Verificación de Variables de Entorno
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL no está definida.");
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
const upload = multer({ storage: multer.memoryStorage() });

// 3. Middleware
app.use(cors(corsOptions));
// NOTA: Es importante que el middleware 'express.json()' se use globalmente
// para las rutas que lo necesiten. Multer se aplicará específicamente en su ruta.
app.use(express.json()); 

// 4. RUTAS DE LA API

app.get('/', (req, res) => {
  res.send('Servidor del Bingo funcionando.');
});

// Ruta para obtener cartones disponibles Y reservados para mostrarlos correctamente
app.get('/cartones-disponibles', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, numeros, status_venta FROM cartones ORDER BY id ASC");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener cartones:', error);
    res.status(500).json({ error: 'Error interno al obtener cartones.' });
  }
});

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

app.post('/reservar-carton/:id', async (req, res) => {
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

// ... (El resto de las rutas como /confirmar-compra y /liberar-reservas-expiradas no cambian)...
app.post('/confirmar-compra', upload.single('comprobante'), async (req, res) => { /*código sin cambios*/ });
app.post('/liberar-reservas-expiradas', async (req, res) => { /*código sin cambios*/ });


// 5. Iniciar el Servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado y escuchando en el puerto ${PORT}`);
  console.log(`CORS configurado para origen: ${corsOptions.origin}`);
});