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

// --- 4. RUTAS ---
app.get('/', (req, res) => {
  res.send('¡El servidor del Bingo Automático está funcionando!');
});

app.post('/guardar-lote-cartones', async (req, res) => {
  const cartones = req.body;
  let client; // Definimos client fuera del try para que sea accesible en el finally
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Usamos una única consulta para borrar, es más eficiente.
    await client.query('DELETE FROM cartones');
    
    for (const carton of cartones) {
      const query = 'INSERT INTO cartones (id, numeros, status_venta, esta_activo) VALUES ($1, $2, $3, $4)';
      
      // --- ¡LA CORRECCIÓN FINAL ESTÁ AQUÍ! ---
      // Volvemos a convertir el array de números a un STRING de texto JSON.
      // Esto es lo que la base de datos está esperando.
      const values = [carton.id, JSON.stringify(carton.numbers), 'disponible', false];
      // --- FIN DE LA CORRECCIÓN ---

      await client.query(query, values);
    }
    
    await client.query('COMMIT');
    res.status(200).json({ message: `¡Lote de ${cartones.length} cartones guardado con éxito!` });
  } catch (error) {
    // Si el cliente se conectó, hacemos rollback.
    if (client) {
        await client.query('ROLLBACK');
    }
    console.error('Error al guardar el lote de cartones:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar los cartones.' });
  } finally {
    // Nos aseguramos de liberar al cliente siempre, haya error o no.
    if (client) {
        client.release();
    }
  }
});

// --- 5. INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});