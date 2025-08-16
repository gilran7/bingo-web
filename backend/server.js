// --- 1. IMPORTACIONES, CONFIGURACIÓN Y MIDDLEWARE (SIN CAMBIOS) ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error("ERROR CATASTRÓFICO: La variable de entorno DATABASE_URL no está definida.");
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
app.use(cors(corsOptions));
app.use(express.json());
console.log(`CORS configurado para permitir el origen: ${corsOptions.origin}`);

// --- 4. RUTAS (ENDPOINTS DE NUESTRA API) ---
app.get('/', (req, res) => {
  res.send('¡El servidor del Bingo Automático está funcionando!');
});

// Endpoint para guardar cartones (YA FUNCIONA)
app.post('/guardar-lote-cartones', async (req, res) => {
    // ... (código existente sin cambios)
  const cartones = req.body;
  let client;
  try {
    client = await pool.connect();
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
    if (client) { await client.query('ROLLBACK'); }
    console.error('Error al guardar el lote de cartones:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar los cartones.' });
  } finally {
    if (client) { client.release(); }
  }
});

// --- ¡NUEVO ENDPOINT! ---
// Endpoint para que los clientes obtengan los cartones disponibles para la venta.
app.get('/cartones-disponibles', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Buscamos en la tabla todos los cartones cuyo estado de venta sea 'disponible'
      const query = "SELECT * FROM cartones WHERE status_venta = 'disponible' ORDER BY id ASC";
      const result = await client.query(query);
      // Devolvemos los resultados como un JSON
      res.status(200).json(result.rows);
    } finally {
      // Liberamos el cliente de vuelta al pool
      client.release();
    }
  } catch (error) {
    console.error('Error al obtener los cartones disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener los cartones.' });
  }
});

// --- 5. INICIAR EL SERVIDOR (SIN CAMBIOS) ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});