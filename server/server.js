const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

// --- CONFIGURACIÓN INICIAL ROBUSTA ---
const app = express();
const PORT = 3000;

// Lógica de conexión con respaldo: usa la variable de entorno de PM2 si existe,
// de lo contrario, usa la cadena hardcodeada para pruebas manuales.
const connectionString = process.env.DATABASE_URL || "postgresql://bingo_user:bingopassword123@localhost:5432/bingo_db";

const pool = new Pool({
  connectionString: connectionString,
});

// Configuración de CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// --- CONFIGURACIÓN DE UPLOAD (MULTER) CON GUARDADO EN DISCO ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // La carpeta 'uploads' debe estar en el directorio raíz del proyecto
        cb(null, path.join(__dirname, '..', 'uploads'))
    },
    filename: function (req, file, cb) {
        // Añade un timestamp para evitar nombres de archivo repetidos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'comprobante-' + uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE ---
app.use(express.json()); // Middleware para parsear JSON
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// --- SERVIR ARCHIVOS ESTÁTICOS ---
// Servir el frontend principal (HTML, CSS, JS del cliente)
app.use(express.static(path.join(__dirname, '..'))); 
// Servir la carpeta 'uploads' para que los comprobantes sean accesibles desde la web
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// --- RUTAS DE LA API ---

app.get('/api/estado-ventas', async (req, res) => {
    try {
        const result = await pool.query('SELECT ventas_activas FROM estado_sistema WHERE id = 1');
        if (result.rows.length === 0) {
            await pool.query('INSERT INTO estado_sistema (id, ventas_activas) VALUES (1, true)');
            return res.status(200).json({ ventas_activas: true });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Error al obtener estado de ventas.' }); }
});

app.post('/api/toggle-ventas', async (req, res) => {
    try {
        const result = await pool.query('UPDATE estado_sistema SET ventas_activas = NOT ventas_activas WHERE id = 1 RETURNING ventas_activas');
        const nuevoEstado = result.rows[0].ventas_activas;
        res.status(200).json({ 
            message: `Ventas ahora están ${nuevoEstado ? 'ABIERTAS' : 'CERRADAS'}.`,
            ventas_activas: nuevoEstado 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al cambiar estado.' });
    }
});

app.get('/api/todos-los-cartones', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM cartones ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener todos los cartones.' }); }
});

app.get('/api/cartones-disponibles', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, numeros, status_venta FROM cartones WHERE status_venta != 'vendido' ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener cartones.' }); }
});

app.get('/api/ventas', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `SELECT id_venta, fecha_venta, nombre_comprador, whatsapp, info_transaccion, cartones_comprados, comprobante_url FROM ventas ORDER BY fecha_venta DESC`;
        const result = await client.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error interno al obtener las ventas.' });
    } finally {
        client.release();
    }
});

app.post('/api/guardar-lote-cartones', async (req, res) => {
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

app.post('/api/reservar-carton/:id', async (req, res) => {
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
        const updateQuery = "UPDATE cartones SET status_venta = 'reservado' WHERE id = $1";
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

app.post('/api/liberar-reserva/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const updateQuery = `UPDATE cartones SET status_venta = 'disponible', reservado_hasta = NULL WHERE id = $1 AND status_venta = 'reservado'`;
        await pool.query(updateQuery, [id]);
        res.status(200).json({ message: `Reserva para el cartón #${id} liberada.` });
    } catch (error) { res.status(500).json({ error: 'Error interno al liberar la reserva.' }); }
});

app.post('/api/confirmar-compra', upload.single('comprobante'), async (req, res) => {
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
        
        const insertVentaQuery = `INSERT INTO ventas (nombre_comprador, whatsapp, info_transaccion, cartones_comprados, comprobante_url) VALUES ($1, $2, $3, $4, $5)`;
        
        // LÓGICA CORREGIDA: Guardamos la ruta web del nuevo archivo, no el nombre original.
        const comprobanteUrl = `/uploads/${comprobante.filename}`;
        const ventaValues = [nombre, whatsapp, transaccion, JSON.stringify(idsArray), comprobanteUrl];
        
        await client.query(insertVentaQuery, ventaValues);
        
        await client.query('COMMIT');
        res.status(200).json({ message: '¡Compra confirmada con éxito!' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error interno al procesar la compra.' });
    } finally {
        client.release();
    }
});

app.delete('/api/todos-los-cartones', async (req, res) => {
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

app.delete('/api/ventas', async (req, res) => {
    try {
        await pool.query('DELETE FROM ventas');
        res.status(200).json({ message: 'El registro de ventas ha sido borrado.' });
    } catch (error) { res.status(500).json({ error: 'Error interno al borrar el registro de ventas.' }); }
});

app.post('/api/resetear-venta', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = `UPDATE cartones SET status_venta = 'disponible', esta_activo = false, reservado_hasta = NULL`;
        await client.query(query);
        await client.query('UPDATE estado_sistema SET ventas_activas = true WHERE id = 1');
        await client.query('COMMIT');
        res.status(200).json({ message: '¡Todos los cartones han sido puestos a la venta!' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error interno al resetear la venta.' });
    } finally {
        client.release();
    }
});

app.post('/api/desactivar-carton/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const updateQuery = `UPDATE cartones SET status_venta = 'disponible', esta_activo = false, reservado_hasta = NULL WHERE id = $1`;
        await pool.query(updateQuery, [id]);
        res.status(200).json({ message: `Cartón #${id} ha sido desactivado y puesto a la venta.` });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al desactivar el cartón.' });
    }
});

app.post('/api/toggle-estado-juego/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `UPDATE cartones SET esta_activo = NOT esta_activo WHERE id = $1 RETURNING esta_activo;`;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cartón no encontrado.' });
        const nuevoEstado = result.rows[0].esta_activo;
        res.status(200).json({ 
            message: `Cartón #${id} ahora está ${nuevoEstado ? 'ACTIVO' : 'INACTIVO'}.`,
            esta_activo: nuevoEstado
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al cambiar el estado del cartón.' });
    }
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor iniciado y escuchando en http://127.0.0.1:${PORT}`);
});