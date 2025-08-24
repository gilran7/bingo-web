document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://api.bingomisterleon.com';
    const PRECIO_POR_CARTON = 1.00;

    const cartonesContainer = document.getElementById('cartones-disponibles-container');
    const mensajeVentasCerradas = document.getElementById('mensaje-ventas-cerradas');
    const checkoutSection = document.getElementById('checkout-section');
    const listaCarrito = document.getElementById('lista-carrito');
    const totalAPagarSpan = document.getElementById('total-a-pagar');
    const purchaseForm = document.getElementById('purchase-form');
    const submitButton = document.getElementById('submit-purchase-button');

    // --- ¡LÓGICA DE PERSISTENCIA! ---
    let carrito = new Map(JSON.parse(localStorage.getItem('bingoCarritoLocal')));

    function guardarCarrito() {
        localStorage.setItem('bingoCarritoLocal', JSON.stringify(Array.from(carrito.entries())));
    }
    // --- FIN DE LA LÓGICA DE PERSISTENCIA ---

    function actualizarCarrito() {
    listaCarrito.innerHTML = '';
    let total = 0;
    const mainContainer = document.getElementById('cartones-disponibles-container');

    if (carrito.size === 0) {
        checkoutSection.classList.add('hidden');
        mainContainer.style.paddingBottom = '20px'; // Restaura el padding original
    } else {
        checkoutSection.classList.remove('hidden');
        mainContainer.style.paddingBottom = '350px'; // Añade espacio para el carrito flotante
        carrito.forEach(carton => {
            const item = document.createElement('li');
            item.classList.add('carrito-item');
            item.innerHTML = `<span>Cartón #${carton.id}</span><button class="quitar-del-carrito" data-id="${carton.id}">Quitar</button>`;
            listaCarrito.appendChild(item);
            total += PRECIO_POR_CARTON;
        });
    }
    totalAPagarSpan.textContent = total.toFixed(2);
    validarFormulario();
}

    async function agregarAlCarrito(carton) {
        try {
            submitButton.disabled = true; // Deshabilitamos botones para evitar acciones conflictivas
            const response = await fetch(`${BACKEND_URL}/reservar-carton/${carton.id}`, { method: 'POST' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "No se pudo reservar.");
            }
            carrito.set(carton.id, carton);
            guardarCarrito();
            actualizarCarrito();
            verificarEstadoYcargarCartones();
        } catch (error) {
            alert(`Error al reservar: ${error.message}`);
            verificarEstadoYcargarCartones();
        } finally {
            validarFormulario(); // Reactivamos el botón de compra si es válido
        }
    }
    
    async function quitarDelCarrito(cartonId) {
        try {
            submitButton.disabled = true;
            const response = await fetch(`${BACKEND_URL}/liberar-reserva/${cartonId}`, { method: 'POST' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "No se pudo liberar la reserva.");
            }
            carrito.delete(cartonId);
            guardarCarrito();
            actualizarCarrito();
            verificarEstadoYcargarCartones();
        } catch (error) {
            console.error('Error al liberar la reserva:', error);
            alert("Hubo un problema. Refrescando la lista...");
            verificarEstadoYcargarCartones();
        } finally {
            validarFormulario();
        }
    }

    function validarFormulario() {
        const esFormularioValido = purchaseForm.checkValidity();
        const tieneItems = carrito.size > 0;
        submitButton.disabled = !esFormularioValido || !tieneItems;
    }

    purchaseForm.addEventListener('input', validarFormulario);

    purchaseForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        validarFormulario();
        if (submitButton.disabled) {
            alert("Por favor, completa todos los campos y selecciona al menos un cartón.");
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Procesando...';
        const formData = new FormData(purchaseForm);
        const cartonesIds = Array.from(carrito.keys());
        formData.append('cartonesIds', JSON.stringify(cartonesIds));

        try {
            const response = await fetch(`${BACKEND_URL}/confirmar-compra`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'No se pudo confirmar la compra.');
            window.location.href = '/gracias.html';
        } catch (error) {
            console.error('Error al confirmar la compra:', error);
            alert(`Error: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Confirmar Compra';
        }
    });

    function renderizarCartones(cartones) {
        cartonesContainer.innerHTML = '';
        cartones.forEach(carton => {
            const cartonDiv = document.createElement('div');
            cartonDiv.classList.add('carton-venta');
            cartonDiv.dataset.id = carton.id;
            
            if (carton.status_venta === 'reservado') {
                cartonDiv.classList.add('reservado');
            }
            
            const matriz = typeof carton.numeros === 'string' ? JSON.parse(carton.numeros) : carton.numeros;
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
            
            if (carton.status_venta === 'reservado' && !carrito.has(carton.id)) {
                 // Es de otro, no hacemos nada. El CSS lo bloquea.
            } else {
                 cartonDiv.addEventListener('click', () => {
                    if (carrito.has(carton.id)) {
                        quitarDelCarrito(carton.id);
                    } else {
                        agregarAlCarrito(carton);
                    }
                });
            }
            cartonesContainer.appendChild(cartonDiv);
        });
    }

    async function verificarEstadoYcargarCartones() {
        cartonesContainer.innerHTML = `<p class="mensaje-feedback">Cargando...</p>`;
        try {
            const estadoResponse = await fetch(`${BACKEND_URL}/estado-ventas`);
            if (!estadoResponse.ok) throw new Error("No se pudo verificar el estado de la venta.");
            const estadoData = await estadoResponse.json();

            if (estadoData.ventas_activas) {
                cartonesContainer.classList.remove('hidden');
                mensajeVentasCerradas.classList.add('hidden');
                const cartonesResponse = await fetch(`${BACKEND_URL}/cartones-disponibles`);
                if (!cartonesResponse.ok) throw new Error('Error al cargar los cartones.');
                const cartones = await cartonesResponse.json();
                renderizarCartones(cartones);
            } else {
                cartonesContainer.innerHTML = '';
                cartonesContainer.classList.add('hidden');
                mensajeVentasCerradas.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error al cargar la página de compra:', error);
            cartonesContainer.innerHTML = `<p class="mensaje-error">No se pudo cargar la información. Por favor, intente más tarde.</p>`;
        }
    }

    listaCarrito.addEventListener('click', (event) => {
        if (event.target.classList.contains('quitar-del-carrito')) {
            const cartonId = parseInt(event.target.dataset.id);
            quitarDelCarrito(cartonId);
        }
    });

    actualizarCarrito();
    verificarEstadoYcargarCartones();
});