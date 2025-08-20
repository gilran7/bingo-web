document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://api.bingomisterleon.com';
    const PRECIO_POR_CARTON = 1.00; // Puedes cambiar este valor

    // --- ELEMENTOS DEL DOM ---
    const cartonesContainer = document.getElementById('cartones-disponibles-container');
    const mensajeVentasCerradas = document.getElementById('mensaje-ventas-cerradas');
    const checkoutSection = document.getElementById('checkout-section');
    const listaCarrito = document.getElementById('lista-carrito');
    const totalAPagarSpan = document.getElementById('total-a-pagar');
    const purchaseForm = document.getElementById('purchase-form');
    const submitButton = document.getElementById('submit-purchase-button');

    let carrito = new Map(); // { id => datosDelCarton }

    // --- LÓGICA DEL CARRITO ---

    function actualizarCarrito() {
        listaCarrito.innerHTML = '';
        let total = 0;

        if (carrito.size === 0) {
            checkoutSection.classList.add('hidden');
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
        validarFormulario();
    }

    async function agregarAlCarrito(carton) {
        try {
            const response = await fetch(`${BACKEND_URL}/reservar-carton/${carton.id}`, { method: 'POST' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No se pudo reservar.");
            
            carrito.set(carton.id, carton);
            const cartonElement = document.querySelector(`.carton-venta[data-id='${carton.id}']`);
            if(cartonElement) {
                cartonElement.classList.add('reservado');
                cartonElement.textContent = 'RESERVADO';
            }
            actualizarCarrito();
        } catch (error) {
            alert(`Error al reservar: ${error.message}`);
            verificarEstadoYcargarCartones(); // Recarga todo para asegurar consistencia
        }
    }
    
   async function quitarDelCarrito(cartonId) {
        try {
            await fetch(`${BACKEND_URL}/liberar-reserva/${cartonId}`, { method: 'POST' });
            carrito.delete(cartonId);
            const cartonElement = document.querySelector(`.carton-venta[data-id='${cartonId}']`);
            if (cartonElement) {
                // En lugar de borrarlo, lo reactivamos. La forma más segura es recargar.
                verificarEstadoYcargarCartones(); 
            }
            actualizarCarrito();
        } catch (error) {
            console.error('Error al liberar la reserva:', error);
            alert("Hubo un problema. Por favor, refresca la página.");
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
        event.preventDefault();
        if (!purchaseForm.checkValidity() || carrito.size === 0) {
            alert("Por favor, completa todos los campos y selecciona al menos un cartón.");
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Procesando...';

        const formData = new FormData();
        formData.append('nombre', document.getElementById('nombre').value);
        formData.append('whatsapp', document.getElementById('whatsapp').value);
        formData.append('transaccion', document.getElementById('transaccion').value);
        formData.append('comprobante', document.getElementById('comprobante').files[0]);
        
        const cartonesIds = Array.from(carrito.keys());
        formData.append('cartonesIds', JSON.stringify(cartonesIds));

        try {
            const response = await fetch(`${BACKEND_URL}/confirmar-compra`, {
                method: 'POST',
                body: formData
            });
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

    // --- CARGA Y RENDERIZADO DE CARTONES ---

    function renderizarCartones(cartones) {
        cartonesContainer.innerHTML = ''; // Limpiamos el contenedor
        cartones.forEach(carton => {
            const cartonDiv = document.createElement('div');
            cartonDiv.classList.add('carton-venta');
            cartonDiv.dataset.id = carton.id;
            
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

            // Aplicamos estilos según el estado del cartón
            if (carton.status_venta === 'reservado') {
                cartonDiv.classList.add('reservado');
                cartonDiv.innerHTML += '<div class="estado-overlay">RESERVADO</div>';
            } else if (carton.status_venta === 'vendido') {
                cartonDiv.classList.add('vendido');
                cartonDiv.innerHTML += '<div class="estado-overlay">VENDIDO</div>';
            } else {
                // Solo los cartones disponibles tienen evento de click
                cartonDiv.addEventListener('click', () => agregarAlCarrito(carton));
            }
            
            cartonesContainer.appendChild(cartonDiv);
        });
    }

    async function verificarEstadoYcargarCartones() {
        cartonesContainer.innerHTML = `<p class="mensaje-feedback">Cargando...</p>`;
        try {
            const estadoResponse = await fetch(`${BACKEND_URL}/estado-ventas`);
            const estadoData = await estadoResponse.json();
            if (!estadoResponse.ok) throw new Error(estadoData.error);

            if (estadoData.ventas_activas) {
                cartonesContainer.classList.remove('hidden');
                mensajeVentasCerradas.classList.add('hidden');
                
                const cartonesResponse = await fetch(`${BACKEND_URL}/cartones-disponibles`);
                if (!cartonesResponse.ok) throw new Error('Error al cargar los cartones.');
                const cartones = await cartonesResponse.json();
                renderizarCartones(cartones);
            } else {
                cartonesContainer.classList.add('hidden');
                mensajeVentasCerradas.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error al cargar la página de compra:', error);
            cartonesContainer.innerHTML = `<p class="mensaje-feedback error">No se pudo cargar la información. Por favor, intente más tarde.</p>`;
        }
    }

    // --- INICIO DE LA APLICACIÓN ---
    listaCarrito.addEventListener('click', (event) => {
        if (event.target.classList.contains('quitar-del-carrito')) {
            const cartonId = parseInt(event.target.dataset.id);
            quitarDelCarrito(cartonId);
        }
    });

    verificarEstadoYcargarCartones(); // ¡ÚNICA LLAMADA DE INICIO!
});