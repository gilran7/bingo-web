// --- 1. IMPORTACIONES ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Verificamos si la variable de entorno crucial existe.
if (!process.env.DATABASE_URL) {
  console.error("ERROR CATASTRÓFICO: La variable de entorno DATABASE_URL no está definida.");
  process.exit(1); 
}

// --- 2. CONFIGURACIÓN ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- ¡LA CORRECCIÓN ESTÁ AQUÍ! ---
// La configuración completa del pool debe estar presente.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false 
  }
});

// --- ¡LA CORRECCIÓN ESTÁ AQUÍ! ---
// La configuración completa de CORS debe estar presente.
const corsOptions = {
  origin: 'https://bingo-frontend-4h3h.onrender.com',
  optionsSuccessStatus: 200
};
// --- FIN DE LA CORRECCIÓN ---

// --- 3. MIDDLEWARE ---
app.use(cors(corsOptions));
app.use(express.json());
console.log(`CORS configurado para permitir el origen: ${corsOptions.origin}`);

// --- 4. RUTAS ---
app.get('/', (req, res) => {
  res.send('¡El servidor del Bingo Automático está funcionando!');
});

app.post('/guardar-lote-cartones', async (req, res) => {
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
    if (client) await client.query('ROLLBACK');
    console.error('Error al guardar el lote de cartones:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar los cartones.' });
  } finally {
    if (client) client.release();
  }
});

app.post('/reservar-carton/:id', async (req, res) => {
    const { id } = req.params;
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const checkQuery = "SELECT * FROM cartones WHERE id = $1 AND status_venta = 'disponible' FOR UPDATE";
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
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
        if (client) await client.query('ROLLBACK');
        console.error(`Error al reservar el cartón #${id}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al intentar reservar.' });
    } finally {
        if (client) client.release();
    }
});

// --- 5. INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});