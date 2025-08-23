require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

// --- VERIFICACIÓN DE VARIABLES DE ENTORNO ---
if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("ERROR: Faltan variables de entorno cruciales (DATABASE_URL, SUPABASE_URL, o SUPABASE_SERVICE_KEY).");
  process.exit(1);
}

// --- CONFIGURACIÓN ---
const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const corsOptions = {
  origin: 'https://bingo-frontend-4h3h.onrender.com', // O la URL de tu frontend final
  optionsSuccessStatus: 200
};
const upload = multer({ storage: multer.memoryStorage() });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- MIDDLEWARE GLOBAL ---
app.use(cors(corsOptions));

// --- RUTAS DE LA API ---

app.get('/', (req, res) => res.send('Servidor del Bingo funcionando.'));

app.get('/todos-los-cartones', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM cartones ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener todos los cartones.' }); }
});

app.get('/cartones-disponibles', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, numeros, status_venta FROM cartones WHERE status_venta != 'vendido' ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener cartones.' }); }
});

app.get('/ventas', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM ventas ORDER BY fecha_venta DESC");
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener las ventas.' }); }
});

app.post('/guardar-lote-cartones', express.json(), async (req, res) => {
    const cartones = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ventas'); // Limpiamos ventas también
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

app.post('/liberar-reserva/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updateQuery = `UPDATE cartones SET status_venta = 'disponible', reservado_hasta = NULL WHERE id = $1 AND status_venta = 'reservado'`;
        await client.query(updateQuery, [id]);
        await client.query('COMMIT');
        res.status(200).json({ message: `Reserva para el cartón #${id} liberada.` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al liberar la reserva.' });
    } finally {
        client.release();
    }
});

app.post('/confirmar-compra', upload.single('comprobante'), async (req, res) => {
    const { nombre, whatsapp, transaccion, cartonesIds } = req.body;
    const comprobante = req.file;
    if (!nombre || !whatsapp || !transaccion || !cartonesIds || !comprobante) {
        return res.status(400).json({ error: 'Faltan datos en el formulario.' });
    }
    const idsArray = JSON.parse(cartonesIds);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const placeholders = idsArray.map((_, i) => `$${i + 1}`).join(',');
        const updateCartonesQuery = `UPDATE cartones SET status_venta = 'vendido', esta_activo = true WHERE id IN (${placeholders})`;
        await client.query(updateCartonesQuery, idsArray);
        
        const nombreArchivo = `${Date.now()}-${comprobante.originalname}`;
        const { error: uploadError } = await supabase.storage.from('comprobantes').upload(nombreArchivo, comprobante.buffer, { contentType: comprobante.mimetype });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('comprobantes').getPublicUrl(nombreArchivo);

        const insertVentaQuery = `INSERT INTO ventas (nombre_comprador, whatsapp, info_transaccion, cartones_comprados, comprobante_url) VALUES ($1, $2, $3, $4, $5)`;
        const ventaValues = [nombre, whatsapp, transaccion, JSON.stringify(idsArray), publicUrl];
        await client.query(insertVentaQuery, ventaValues);

        await client.query('COMMIT');
        res.status(200).json({ message: '¡Compra confirmada con éxito!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al confirmar la compra:', error);
        res.status(500).json({ error: 'Error interno al procesar la compra.' });
    } finally {
        client.release();
    }
});

app.delete('/todos-los-cartones', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ventas');
        await client.query('DELETE FROM cartones');
        await client.query('COMMIT');
        res.status(200).json({ message: 'Todos los cartones y ventas han sido borrados.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al borrar los cartones.' });
    } finally {
        client.release();
    }
});

app.post('/resetear-venta', express.json(), async (req, res) => {
    try {
        const query = `UPDATE cartones SET status_venta = 'disponible', esta_activo = false, reservado_hasta = NULL`;
        await pool.query(query);
        res.status(200).json({ message: '¡Todos los cartones han sido puestos a la venta!' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al resetear la venta.' });
    }
});


// --- INICIAR SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado y escuchando en el puerto ${PORT}`);
});