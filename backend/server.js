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

app.post('/guardar-lote-cartones', async (req, res) => {
  const cartones = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM cartones');
    for (const carton of cartones) {
      const query = 'INSERT INTO cartones (id, numeros, status_venta, esta_activo) VALUES ($1, $2, $3, $4)';
      
      // --- ¡LA CORRECCIÓN ESTÁ AQUÍ! ---
      // Quitamos JSON.stringify() y pasamos el array de números directamente.
      // El conector 'pg' lo convertirá a JSONB por nosotros.
      const values = [carton.id, carton.numbers, 'disponible', false];
      // --- FIN DE LA CORRECCIÓN ---

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