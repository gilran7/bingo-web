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
const corsOptions = {
  origin: 'https://delicate-pudding-cda831.netlify.app',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- ¡NUEVA LÍNEA DE DIAGNÓSTICO! ---
// Imprimimos la configuración en la consola para verificarla en los logs de Render.
console.log(`CORS configurado para permitir el origen: ${corsOptions.origin}`);

// --- 4. RUTAS (ENDPOINTS DE NUESTRA API) ---
// ... (El resto del archivo no cambia) ...
app.get('/', (req, res) => {
  res.send('¡El servidor del Bingo Automático está funcionando!');
});

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