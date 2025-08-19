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

// Middleware
app.use(cors(corsOptions));
// Nota: express.json() se aplicará individualmente en cada ruta que lo necesite.

// RUTAS DE LA API

app.get('/', (req, res) => {
  res.send('Servidor del Bingo funcionando.');
});

// Ruta para que los clientes obtengan los cartones disponibles/reservados
app.get('/cartones-disponibles', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, numeros, status_venta FROM cartones ORDER BY id ASC");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener cartones:', error);
    res.status(500).json({ error: 'Error interno al obtener cartones.' });
  }
});

// --- ¡NUEVA RUTA PARA EL PANEL DE ADMINISTRACIÓN! ---
// Ruta segura para que el admin obtenga el estado de TODOS los cartones
app.get('/todos-los-cartones', async (req, res) => {
    // En una app real, aquí verificaríamos un token de administrador.
    try {
        const result = await pool.query("SELECT * FROM cartones ORDER BY id ASC");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener todos los cartones:', error);
        res.status(500).json({ error: 'Error interno al obtener todos los cartones.' });
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
        console.error('Error al guardar lote:', error);
        res.status(500).json({ error: 'Error interno al guardar el lote.' });
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
        
        // --- ¡CAMBIO CLAVE! ---
        // Ya no calculamos la expiración. Simplemente actualizamos el estado.
        const updateQuery = "UPDATE cartones SET status_venta = 'reservado', reservado_hasta = NULL WHERE id = $2";
        await client.query(updateQuery, [id]);
        // --- FIN DEL CAMBIO ---

        await client.query('COMMIT');
        res.status(200).json({ 
            message: `¡Cartón #${id} reservado con éxito!`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error al reservar cartón #${id}:`, error);
        res.status(500).json({ error: 'Error interno al reservar.' });
    } finally {
        client.release();
    }
});

app.post('/liberar-reserva/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    try {
        const updateQuery = `
            UPDATE cartones 
            SET status_venta = 'disponible', reservado_hasta = NULL 
            WHERE id = $1 AND status_venta = 'reservado'
        `;
        await pool.query(updateQuery, [id]);
        res.status(200).json({ message: `Reserva para el cartón #${id} liberada.` });
    } catch (error) {
        console.error(`Error al liberar reserva para el cartón #${id}:`, error);
        res.status(500).json({ error: 'Error interno al liberar la reserva.' });
    }
});

app.post('/confirmar-compra', upload.single('comprobante'), async (req, res) => {
    const { nombre, whatsapp, transaccion, cartonesIds } = req.body;
    const comprobante = req.file;
    if (!nombre || !whatsapp || !transaccion || !cartonesIds || !comprobante) {
        return res.status(400).json({ error: 'Faltan datos en el formulario.' });
    }
    const idsArray = JSON.parse(cartonesIds);
    if (!Array.isArray(idsArray) || idsArray.length === 0) {
        return res.status(400).json({ error: 'No se seleccionaron cartones.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const placeholders = idsArray.map((_, i) => `$${i + 1}`).join(',');
        const updateCartonesQuery = `UPDATE cartones SET status_venta = 'vendido', esta_activo = true WHERE id IN (${placeholders})`;
        await client.query(updateCartonesQuery, idsArray);

        const insertVentaQuery = `
            INSERT INTO ventas (nombre_comprador, whatsapp, info_transaccion, cartones_comprados)
            VALUES ($1, $2, $3, $4)
        `;
        const ventaValues = [nombre, whatsapp, transaccion, JSON.stringify(idsArray)];
        await client.query(insertVentaQuery, ventaValues);

        await client.query('COMMIT');
        
        console.log('Venta registrada:', { nombre, whatsapp, transaccion, cartones: idsArray.join(', ') });
        res.status(200).json({ message: '¡Compra confirmada con éxito! Gracias por participar.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al confirmar la compra:', error);
        res.status(500).json({ error: 'Error interno al procesar la compra.' });
    } finally {
        client.release();
    }
});

app.post('/liberar-reservas-expiradas', express.json(), async (req, res) => {
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

// Ruta para que el admin borre TODOS los cartones
app.delete('/todos-los-cartones', async (req, res) => {
    // En el futuro, aquí iría una validación de seguridad para el admin
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM cartones');
        // Opcional: También podríamos borrar la tabla de ventas si queremos un reinicio total.
        // await client.query('DELETE FROM ventas');
        await client.query('COMMIT');
        res.status(200).json({ message: 'Todos los cartones han sido borrados exitosamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al borrar todos los cartones:', error);
        res.status(500).json({ error: 'Error interno al intentar borrar los cartones.' });
    } finally {
        client.release();
    }
});

// Iniciar el Servidor
app.listen(PORT, () => {
  console.log(`Servidor v2.1 iniciado y escuchando en el puerto ${PORT}`);
  console.log(`CORS configurado para origen: ${corsOptions.origin}`);
});