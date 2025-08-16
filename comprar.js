document.addEventListener('DOMContentLoaded', () => {
    // La URL de nuestro backend desplegado en Render
    const BACKEND_URL = 'https://bingo-backend-nmxa.onrender.com';
    const container = document.getElementById('cartones-disponibles-container');

    // Función para "dibujar" un único cartón de bingo en la página
    function renderizarCarton(carton) {
        const cartonDiv = document.createElement('div');
        cartonDiv.classList.add('carton-venta');
        cartonDiv.dataset.id = carton.id; // Guardamos el ID en el elemento

        // La matriz de números viene como un string JSON, la convertimos de nuevo a un array
        const matriz = JSON.parse(carton.numeros);

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

        // ¡Aquí añadiremos la lógica para seleccionar y reservar el cartón en el futuro!
        cartonDiv.addEventListener('click', () => {
            alert(`Has seleccionado el cartón #${carton.id}`);
        });

        return cartonDiv;
    }

    // Función principal para pedir los cartones al servidor y mostrarlos
    async function cargarCartonesDisponibles() {
        try {
            const response = await fetch(`${BACKEND_URL}/cartones-disponibles`);

            if (!response.ok) {
                throw new Error('La respuesta del servidor no fue exitosa.');
            }

            const cartones = await response.json();

            // Limpiamos el mensaje de "Cargando..."
            container.innerHTML = '';

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
            container.innerHTML = '<p class="mensaje-error">Error de conexión. Por favor, intenta de nuevo más tarde.</p>';
        }
    }

    // ¡Iniciamos todo el proceso!
    cargarCartonesDisponibles();
});