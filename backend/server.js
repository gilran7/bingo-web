// --- 1. IMPORTACIONES ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// --- 2. CONFIGURACIÓN ---
const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- 3. MIDDLEWARE ---

// --- ¡CAMBIO CRÍTICO! ---
// Configuramos CORS para aceptar peticiones SOLAMENTE desde nuestro frontend en Netlify.
// Esto es mucho más seguro que aceptar peticiones de cualquier sitio.
const corsOptions = {
  origin: 'https://delicate-pudding-cda831.netlify.app',
  optionsSuccessStatus: 200 // Para navegadores antiguos
};
app.use(cors(corsOptions));
// --- FIN DEL CAMBIO ---

app.use(express.json());

// --- 4. RUTAS (ENDPOINTS DE NUESTRA API) ---

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡El servidor del Bingo Automático está funcionando!');
});

// Endpoint para guardar un lote completo de cartones
app.post('/guardar-lote-cartones', async (req, res) => {
  const cartones = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM cartones');
    for (const carton of cartones) {
      const query = 'INSERT INTO cartones (id, numeros, status_venta, esta_activo) VALUES ($1, $2, $3, $4)';
      const values = [carton.id, JSON.stringify(carton.numbers), 'disponible', false];
      await pool.query(query, values);
    }
    await pool.query('COMMIT');
    res.status(200).json({ message: `Lote de ${cartones.length} cartones guardado con éxito.` });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al guardar el lote de cartones:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar los cartones.' });
  }
});

// --- 5. INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});