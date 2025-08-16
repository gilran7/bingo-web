document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://bingo-backend-nmxa.onrender.com';
    const container = document.getElementById('cartones-disponibles-container');

    // Función para renderizar un cartón (actualizada)
    function renderizarCarton(carton) {
        const cartonDiv = document.createElement('div');
        cartonDiv.classList.add('carton-venta');
        cartonDiv.dataset.id = carton.id;

        const matriz = carton.numeros;

        let cartonHTML = `
            <h4>Cartón #${carton.id}</h4>
            <table>
                <thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead>
                <tbody>`;
        
        for (let i = 0; i < 5; i++) { /* ... (código de la tabla sin cambios) ... */ }
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

        // --- ¡INICIO DE LA NUEVA LÓGICA DE RESERVA! ---
        cartonDiv.addEventListener('click', async () => {
            // Prevenimos clics dobles o clics en cartones ya reservados
            if (cartonDiv.classList.contains('reservado')) {
                return;
            }

            const cartonId = cartonDiv.dataset.id;
            
            try {
                const response = await fetch(`${BACKEND_URL}/reservar-carton/${cartonId}`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (!response.ok) {
                    // Si el cartón ya no está disponible, el servidor nos lo dirá.
                    throw new Error(result.error || 'No se pudo reservar el cartón.');
                }
                
                // Si la reserva fue exitosa:
                alert(result.message); // Mostramos el mensaje de éxito del backend
                
                // Actualizamos la apariencia del cartón
                cartonDiv.classList.add('reservado');

            } catch (error) {
                console.error('Error al reservar:', error);
                // Mostramos el error específico (ej: "Este cartón ya no está disponible.")
                alert(`Error: ${error.message}`);
                // Opcional: Recargar la lista de cartones para mostrar el estado actualizado
                cargarCartonesDisponibles();
            }
        });
        // --- FIN DE LA NUEVA LÓGICA DE RESERVA! ---

        return cartonDiv;
    }

    // Función para cargar los cartones (sin cambios)
    async function cargarCartonesDisponibles() {
        try {
            const response = await fetch(`${BACKEND_URL}/cartones-disponibles`);
            const cartones = await response.json();
            container.innerHTML = '';

            if (!response.ok) throw new Error(cartones.error || 'Error del servidor.');

            if (cartones.length === 0) {
                container.innerHTML = '<p class="mensaje-feedback">¡No hay cartones a la venta en este momento, vuelve pronto!</p>';
            } else {
                cartones.forEach(carton => {
                    const cartonElemento = renderizarCarton(carton);
                    container.appendChild(cartonElemento);
                });
            }
        } catch (error) {
            console.error('Error al cargar los cartones:', error);
            container.innerHTML = `<p class="mensaje-error">Error de conexión: ${error.message}. Por favor, intenta de nuevo más tarde.</p>`;
        }
    }
    
    cargarCartonesDisponibles();
});