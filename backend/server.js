require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
// --- ¡NUEVA IMPORTACIÓN PARA MANEJAR ARCHIVOS! ---
const multer = require('multer');

if (!process.env.DATABASE_URL) { /* ... */ }

// --- CONFIGURACIÓN DE MULTER ---
// Configuramos multer para que maneje los archivos en memoria.
// No los guardaremos en el servidor, solo los recibiremos.
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({ /* ... */ });
const corsOptions = { /* ... */ };
app.use(cors(corsOptions));
app.use(express.json());
console.log(`CORS configurado para origen: ${corsOptions.origin}`);

// --- RUTAS DE LA API ---
app.get('/', (req, res) => { /* ... */ });
app.get('/cartones-disponibles', async (req, res) => { /* ... */ });
app.post('/guardar-lote-cartones', async (req, res) => { /* ... */ });
app.post('/reservar-carton/:id', async (req, res) => { /* ... */ });
app.post('/liberar-reservas-expiradas', async (req, res) => { /* ... */ });

// --- ¡NUEVO ENDPOINT FINAL! ---
// Usamos 'upload.single('comprobante')' como middleware para procesar el archivo.
app.post('/confirmar-compra', upload.single('comprobante'), async (req, res) => {
    // Los datos de texto vienen en req.body.
    // El archivo viene en req.file.
    // Los IDs de los cartones los enviaremos como un string JSON.
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
        
        // Creamos un placeholder para la consulta ($1, $2, $3...)
        const placeholders = idsArray.map((_, i) => `$${i + 1}`).join(',');
        
        // Actualizamos todos los cartones comprados en una sola consulta.
        // Cambiamos el estado de venta a 'vendido' y los activamos para el juego.
        const updateQuery = `
            UPDATE cartones 
            SET status_venta = 'vendido', esta_activo = true 
            WHERE id IN (${placeholders})
        `;
        
        await client.query(updateQuery, idsArray);
        
        await client.query('COMMIT');

        // En una versión futura, aquí podríamos guardar los datos y el comprobante
        // en otra tabla 'ventas' o enviar un email/notificación.
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

// --- INICIAR EL SERVIDOR ---
app.listen(PORT, () => { /* ... */ });