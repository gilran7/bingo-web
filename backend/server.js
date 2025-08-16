// --- 1. IMPORTACIONES ---
// Carga las variables de entorno desde el archivo .env
require('dotenv').config();
// Importamos el framework Express para crear el servidor
const express = require('express');
// Importamos 'cors' para permitir peticiones desde nuestro frontend
const cors = require('cors');
// Importamos el conector de PostgreSQL (Pool es más eficiente para manejar múltiples conexiones)
const { Pool } = require('pg');

// --- 2. CONFIGURACIÓN ---
// Creamos una instancia de la aplicación Express
const app = express();
// Definimos el puerto en el que escuchará el servidor. Render lo asignará automáticamente.
const PORT = process.env.PORT || 3000;

// Creamos un nuevo "pool" de conexiones a la base de datos usando la URI de nuestro .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render puede requerir esta configuración para conexiones seguras
  ssl: {
    rejectUnauthorized: false
  }
});

// --- 3. MIDDLEWARE ---
// Usamos 'cors' para permitir que nuestro frontend (en Netlify) se comunique con este backend (en Render)
app.use(cors());
// Usamos el middleware de Express para que pueda entender JSON en el cuerpo de las peticiones
app.use(express.json());

// --- 4. RUTAS (ENDPOINTS DE NUESTRA API) ---

// Ruta de prueba para verificar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('¡El servidor del Bingo Automático está funcionando!');
});

// Endpoint para guardar un lote completo de cartones (desde el panel de admin)
app.post('/guardar-lote-cartones', async (req, res) => {
  // El frontend nos enviará un array de cartones en req.body
  const cartones = req.body;
  
  try {
    // Iniciamos una transacción. Esto asegura que todos los cartones se guardan, o ninguno.
    await pool.query('BEGIN');

    // Borramos los cartones viejos para empezar de cero con el nuevo lote
    await pool.query('DELETE FROM cartones');

    // Preparamos la consulta para insertar múltiples filas a la vez. Es muy eficiente.
    for (const carton of cartones) {
      const query = 'INSERT INTO cartones (id, numeros, status_venta, esta_activo) VALUES ($1, $2, $3, $4)';
      const values = [carton.id, JSON.stringify(carton.numbers), 'disponible', false];
      await pool.query(query, values);
    }
    
    // Si todo fue bien, confirmamos la transacción
    await pool.query('COMMIT');
    
    res.status(200).json({ message: `Lote de ${cartones.length} cartones guardado con éxito.` });
  } catch (error) {
    // Si algo falla, revertimos la transacción para no dejar datos a medias
    await pool.query('ROLLBACK');
    console.error('Error al guardar el lote de cartones:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar los cartones.' });
  }
});

// ¡Aquí añadiremos el resto de endpoints (obtener, reservar, comprar, etc.) en los siguientes pasos!

// --- 5. INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});