document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://api.bingomisterleon.com:3000';
    const PRECIO_POR_CARTON = 1.00; // Puedes cambiar este valor

    // Elementos del DOM
    const container = document.getElementById('cartones-disponibles-container');
    const checkoutSection = document.getElementById('checkout-section');
    const listaCarrito = document.getElementById('lista-carrito');
    const totalAPagarSpan = document.getElementById('total-a-pagar');
    const purchaseForm = document.getElementById('purchase-form');
    const submitButton = document.getElementById('submit-purchase-button');

    let carrito = new Map(); // Usaremos un Map para manejar el carrito: { id => datosDelCarton }

    // --- LÓGICA DEL CARRITO ---

    function actualizarCarrito() {
        listaCarrito.innerHTML = '';
        let total = 0;

        if (carrito.size === 0) {
            checkoutSection.classList.add('hidden');
            submitButton.disabled = true;
            return;
        }

        checkoutSection.classList.remove('hidden');

        carrito.forEach(carton => {
            const item = document.createElement('li');
            item.classList.add('carrito-item');
            item.innerHTML = `
                <span>Cartón #${carton.id}</span>
                <button class="quitar-del-carrito" data-id="${carton.id}">Quitar</button>
            `;
            listaCarrito.appendChild(item);
            total += PRECIO_POR_CARTON;
        });

        totalAPagarSpan.textContent = total.toFixed(2);
        validarFormulario(); // Validamos el formulario cada vez que el carrito cambia
    }

    async function agregarAlCarrito(carton) {
        // Lógica de reserva en el backend
        try {
            const response = await fetch(`${BACKEND_URL}/reservar-carton/${carton.id}`, { method: 'POST' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Si la reserva es exitosa, añadimos al carrito local
            carrito.set(carton.id, carton);
            document.querySelector(`.carton-venta[data-id='${carton.id}']`).classList.add('reservado');
            actualizarCarrito();

        } catch (error) {
            alert(`Error al reservar: ${error.message}`);
            cargarCartonesDisponibles(); // Recargamos para ver el estado real
        }
    }
    
   async function quitarDelCarrito(cartonId) {
    try {
        // --- ¡NUEVA LÓGICA DE LIBERACIÓN! ---
        // Le decimos al backend que libere la reserva.
        await fetch(`${BACKEND_URL}/liberar-reserva/${cartonId}`, {
            method: 'POST'
        });

        // Actualizamos el estado local solo si el backend tuvo éxito.
        carrito.delete(cartonId);
        const cartonElement = document.querySelector(`.carton-venta[data-id='${cartonId}']`);
        if (cartonElement) {
            cartonElement.classList.remove('reservado');
        }
        actualizarCarrito();

        } catch (error) {
        console.error('Error al liberar la reserva:', error);
        alert("Hubo un problema al intentar liberar la reserva. Por favor, refresca la página.");
        }
   }

    // --- LÓGICA DEL FORMULARIO ---

    function validarFormulario() {
        const esFormularioValido = purchaseForm.checkValidity();
        const tieneItems = carrito.size > 0;
        submitButton.disabled = !esFormularioValido || !tieneItems;
    }

    purchaseForm.addEventListener('input', validarFormulario);

    purchaseForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Evitamos que la página se recargue
    if (!purchaseForm.checkValidity() || carrito.size === 0) {
        alert("Por favor, completa todos los campos y selecciona al menos un cartón.");
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = 'Procesando...';

    // --- ¡NUEVA LÓGICA DE ENVÍO! ---
    // 1. Creamos un objeto FormData para empaquetar los datos y el archivo.
    const formData = new FormData();
    formData.append('nombre', document.getElementById('nombre').value);
    formData.append('whatsapp', document.getElementById('whatsapp').value);
    formData.append('transaccion', document.getElementById('transaccion').value);
    formData.append('comprobante', document.getElementById('comprobante').files[0]);
    
    // 2. Convertimos los IDs de los cartones del carrito a un string JSON y lo añadimos.
    const cartonesIds = Array.from(carrito.keys());
    formData.append('cartonesIds', JSON.stringify(cartonesIds));

    try {
        // 3. Enviamos el FormData al endpoint correcto.
        const response = await fetch(`${BACKEND_URL}/confirmar-compra`, {
            method: 'POST',
            body: formData // Al enviar FormData, el navegador establece las cabeceras ('Content-Type') automáticamente.
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'No se pudo confirmar la compra.');
        }
        
        // 4. Si la compra es exitosa, redirigimos a la página de gracias.
        window.location.href = '/gracias.html';

    } catch (error) {
        console.error('Error al confirmar la compra:', error);
        alert(`Error: ${error.message}`);
        submitButton.disabled = false;
        submitButton.textContent = 'Confirmar Compra';
    }
});

    // --- CARGA INICIAL DE CARTONES ---

    function renderizarCarton(carton) {
        const cartonDiv = document.createElement('div');
        cartonDiv.classList.add('carton-venta');
        cartonDiv.dataset.id = carton.id;
        const matriz = carton.numeros;
        let cartonHTML = `<h4>Cartón #${carton.id}</h4><table>...</table>`; // (El HTML de la tabla es el mismo)
        let tablaHTML = '<table><thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>';
        for (let i = 0; i < 5; i++) {
            tablaHTML += '<tr>';
            for (let j = 0; j < 5; j++) {
                tablaHTML += `<td>${matriz[i][j] === 'FREE' ? '★' : matriz[i][j]}</td>`;
            }
            tablaHTML += '</tr>';
        }
        tablaHTML += '</tbody></table>';
        cartonDiv.innerHTML = `<h4>Cartón #${carton.id}</h4>${tablaHTML}`;

        cartonDiv.addEventListener('click', () => {
            if (carrito.has(carton.id)) {
                quitarDelCarrito(carton.id);
            } else {
                agregarAlCarrito(carton);
            }
        });
        return cartonDiv;
    }

    async function cargarCartonesDisponibles() {
        // (Esta función no necesita cambios, es la misma que ya funcionaba)
        try {
            const response = await fetch(`${BACKEND_URL}/cartones-disponibles`);
            const cartones = await response.json();
            container.innerHTML = '';
            if (!response.ok) throw new Error(cartones.error || 'Error del servidor.');
            if (cartones.length === 0) {
                container.innerHTML = '<p class="mensaje-feedback">¡No hay cartones a la venta en este momento!</p>';
            } else {
                cartones.forEach(carton => container.appendChild(renderizarCarton(carton)));
            }
        } catch (error) {
            container.innerHTML = `<p class="mensaje-error">Error de conexión: ${error.message}.</p>`;
        }
    }
    
    // Event listener para los botones "Quitar" del carrito (delegación de eventos)
    listaCarrito.addEventListener('click', (event) => {
        if (event.target.classList.contains('quitar-del-carrito')) {
            const cartonId = parseInt(event.target.dataset.id);
            quitarDelCarrito(cartonId);
        }
    });

    cargarCartonesDisponibles();
});