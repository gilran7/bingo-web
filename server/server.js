require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("ERROR: Faltan variables de entorno cruciales.");
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
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.use(cors(corsOptions));

// --- RUTAS DE LA API ---

app.get('/', (req, res) => res.send('Servidor del Bingo funcionando.'));

app.get('/estado-ventas', async (req, res) => {
    try {
        const result = await pool.query('SELECT ventas_activas FROM estado_sistema WHERE id = 1');
        if (result.rows.length === 0) {
            await pool.query('INSERT INTO estado_sistema (id, ventas_activas) VALUES (1, true)');
            return res.status(200).json({ ventas_activas: true });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Error al obtener estado de ventas.' }); }
});

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
        // --- ¡CONSULTA EXPLÍCITA Y A PRUEBA DE FALLOS! ---
        const query = `
            SELECT
                id_venta,
                fecha_venta,
                nombre_comprador,
                whatsapp,
                info_transaccion,
                cartones_comprados,
                comprobante_url
            FROM ventas
            ORDER BY fecha_venta DESC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las ventas:', error);
        res.status(500).json({ error: 'Error interno al obtener las ventas.' });
    }
});

app.post('/guardar-lote-cartones', express.json(), async (req, res) => {
    const cartones = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ventas');
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
    if (!nombre || !whatsapp || !transaccion || !cartonesIds || !comprobante) return res.status(400).json({ error: 'Faltan datos en el formulario.' });
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

app.delete('/ventas', async (req, res) => {
    try {
        await pool.query('DELETE FROM ventas');
        res.status(200).json({ message: 'El registro de ventas ha sido borrado.' });
    } catch (error) {
        console.error('Error al borrar ventas:', error);
        res.status(500).json({ error: 'Error interno al borrar el registro de ventas.' });
    }
});
app.post('/resetear-venta', express.json(), async (req, res) => {
    try {
        const query = `UPDATE cartones SET status_venta = 'disponible', esta_activo = false, reservado_hasta = NULL`;
        await pool.query(query);
        await pool.query('UPDATE estado_sistema SET ventas_activas = true WHERE id = 1');
        res.status(200).json({ message: '¡Todos los cartones han sido puestos a la venta!' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al resetear la venta.' });
    }
});

app.post('/toggle-ventas', express.json(), async (req, res) => {
    try {
        const estadoActualResult = await pool.query('SELECT ventas_activas FROM estado_sistema WHERE id = 1');
        const nuevoEstado = !estadoActualResult.rows[0].ventas_activas;
        await pool.query('UPDATE estado_sistema SET ventas_activas = $1 WHERE id = 1', [nuevoEstado]);
        res.status(200).json({
            message: `Ventas ahora están ${nuevoEstado ? 'ABIERTAS' : 'CERRADAS'}.`,
            ventas_activas: nuevoEstado
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado de venta.' });
    }
});

// --- ¡NUEVA RUTA AÑADIDA! ---
app.post('/toggle-estado-juego/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            UPDATE cartones
            SET esta_activo = NOT esta_activo
            WHERE id = $1
            RETURNING esta_activo;
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cartón no encontrado.' });
        }
        const nuevoEstado = result.rows[0].esta_activo;
        res.status(200).json({
            message: `Cartón #${id} ahora está ${nuevoEstado ? 'ACTIVO' : 'INACTIVO'}.`,
            esta_activo: nuevoEstado
        });
    } catch (error) {
        console.error(`Error al cambiar estado del cartón #${id}:`, error);
        res.status(500).json({ error: 'Error interno al cambiar el estado del cartón.' });
    }
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado y escuchando en el puerto ${PORT}`);
});