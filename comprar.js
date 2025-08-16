document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://bingo-backend-nmxa.onrender.com';
    const container = document.getElementById('cartones-disponibles-container');

    // Función para renderizar un cartón (sin cambios)
    function renderizarCarton(carton) {
        const cartonDiv = document.createElement('div');
        cartonDiv.classList.add('carton-venta');
        cartonDiv.dataset.id = carton.id;

        // La matriz de números viene como un string JSON, la convertimos de nuevo a un array
        // Nota: En la respuesta del servidor, 'numeros' ya es un objeto JSON, no un string.
        // Si viniera como string, usaríamos JSON.parse(carton.numeros).
        const matriz = carton.numeros;

        let cartonHTML = `
            <h4>Cartón #${carton.id}</h4>
            <table>
                <thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead>
                <tbody>`;
        
        for (let i = 0; i < 5; i++) {
            cartonHTML += '<tr>';
            for (let j = 0; j < 5; j++) {
                const valor = matriz[i][j];
                cartonHTML += `<td>${valor === 'FREE' ? '★' : valor}</td>`;
            }
            cartonHTML += '</tr>';
        }
        
        cartonHTML += `</tbody></table>`;
        cartonDiv.innerHTML = cartonHTML;

        cartonDiv.addEventListener('click', () => {
            alert(`Has seleccionado el cartón #${carton.id}`);
        });

        return cartonDiv;
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Función principal para cargar los cartones (versión simplificada y más robusta)
    async function cargarCartonesDisponibles() {
        try {
            // Hacemos la petición al endpoint correcto.
            const response = await fetch(`${BACKEND_URL}/cartones-disponibles`);
            
            // Convertimos la respuesta a JSON. Si hay un error de red aquí, el 'catch' lo capturará.
            const cartones = await response.json();

            // Limpiamos el contenedor.
            container.innerHTML = '';

            // Verificamos si la respuesta del servidor indica un error (ej. status 500)
            if (!response.ok) {
                // Usamos el mensaje de error que nuestro propio backend nos da.
                throw new Error(cartones.error || 'Error del servidor.');
            }

            if (cartones.length === 0) {
                container.innerHTML = '<p class="mensaje-feedback">¡No hay cartones a la venta en este momento, vuelve pronto!</p>';
            } else {
                cartones.forEach(carton => {
                    const cartonElemento = renderizarCarton(carton);
                    container.appendChild(cartonElemento);
                });
            }

        } catch (error) {
            // Este bloque 'catch' ahora captura tanto errores de red como errores del servidor.
            console.error('Error al cargar los cartones:', error);
            container.innerHTML = `<p class="mensaje-error">Error de conexión: ${error.message}. Por favor, intenta de nuevo más tarde.</p>`;
        }
    }
    // --- FIN DE LA CORRECCIÓN ---

    // Iniciamos el proceso
    cargarCartonesDisponibles();
});