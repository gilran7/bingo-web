document.addEventListener('DOMContentLoaded', () => {
    // --- BARRERA DE SEGURIDAD ---
    /* ... (tu código de barrera de seguridad va aquí) ... */

    const BACKEND_URL = 'https://api.bingomisterleon.com';

    // --- CONSTANTES Y ELEMENTOS DEL DOM ---
    const botonCantar = document.getElementById('boton-cantar');
    const botonNuevaRonda = document.getElementById('boton-nueva-ronda');
    const botonAnadirCarton = document.getElementById('boton-anadir-carton');
    const botonGuardarCartones = document.getElementById('guardar-cartones-almacen');
    const numeroCantadoDisplay = document.getElementById('numero-cantado');
    const contenedorNumerosMaestros = document.getElementById('contenedor-numeros-maestros');
    const contenedorColumnasLetras = document.getElementById('contenedor-columnas-letras');
    const listaHistorial = document.getElementById('lista-historial');
    const botonModo = document.getElementById('boton-modo');
    const displayModo = document.getElementById('display-modo');
    const zonaDeCartones = document.getElementById('zona-de-cartones');
    const botonRetroceder = document.getElementById('boton-retroceder');
    const botonBorrarCartones = document.getElementById('boton-borrar-cartones');
    const imagenPatron = document.getElementById('imagen-patron');
    const selectPatron = document.getElementById('select-patron');
    const botonVerificarDuplicados = document.getElementById('boton-verificar-duplicados');
    const botonMostrarGanadores = document.getElementById('boton-mostrar-ganadores');
    const modalBackdrop = document.getElementById('modal-ganador-backdrop');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalCartonContainer = document.getElementById('modal-carton-container');
    const botonResetearVenta = document.getElementById('boton-resetear-venta');
    const toggleVentasBtn = document.getElementById('toggle-ventas-btn');
    const tablaMaestra = document.getElementById('tabla-maestra');

    // --- VARIABLES DE ESTADO ---
    let ventasEstanActivas = true;
    let numerosCantados = [];
    let modoJuego = 'automatico';
    let juegoTerminado = false;
    let cartonesEnJuego = [];
    let ganadoresInfo = [];
    let indiceGanadorActual = 0;

    // --- FUNCIONES DE GESTIÓN CON BACKEND ---
    async function cargarEstadoDelJuego() {
        try {
            const [estadoResponse, cartonesResponse, ventasResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/estado-ventas`),
                fetch(`${BACKEND_URL}/todos-los-cartones`),
                fetch(`${BACKEND_URL}/ventas`)
            ]);

            if (!estadoResponse.ok) throw new Error('No se pudo obtener el estado de la venta.');
            if (!cartonesResponse.ok) throw new Error('No se pudo conectar con el servidor para los cartones.');
            if (!ventasResponse.ok) throw new Error('No se pudo obtener el registro de ventas.');

            const estadoData = await estadoResponse.json();
            const cartonesDesdeDB = await cartonesResponse.json();
            const ventas = await ventasResponse.json();

            // 1. Procesar Estado de Venta
            ventasEstanActivas = estadoData.ventas_activas;
            actualizarBotonVentas();

            // 2. Procesar y Dibujar Cartones
            cartonesEnJuego = [];
            zonaDeCartones.innerHTML = '';
            cartonesDesdeDB.forEach(carton => {
                const matrizNumeros = typeof carton.numeros === 'string' ? JSON.parse(carton.numeros) : carton.numeros;
                reconstruirCartonDesdeDatos(carton.id, matrizNumeros, carton.esta_activo, carton.status_venta);
            });

            // 3. Procesar y Dibujar la Tabla de Ventas
            const tbody = document.getElementById('cuerpo-tabla-ventas');
            if (tbody) { // Verificación para evitar errores si la tabla no existe
                tbody.innerHTML = '';
                ventas.forEach(venta => {
                    try {
                        const fecha = venta.fecha_venta ? new Date(venta.fecha_venta).toLocaleString() : 'N/A';
                        const comprador = venta.nombre_comprador || 'N/A';
                        const whatsapp = venta.whatsapp || 'N/A';
                        const transaccion = venta.info_transaccion || 'N/A';
                        const cartones = venta.cartones_comprados && typeof venta.cartones_comprados === 'string' ? JSON.parse(venta.cartones_comprados).join(', ') : 'N/A';
                        const comprobante = venta.comprobante_url ? `<a href="${venta.comprobante_url}" target="_blank" rel="noopener noreferrer">Ver</a>` : 'No disponible';
                        const fila = `<tr><td>${fecha}</td><td>${comprador}</td><td>${whatsapp}</td><td>${transaccion}</td><td>${cartones}</td><td>${comprobante}</td></tr>`;
                        tbody.innerHTML += fila;
                    } catch (e) {
                        console.error('Error al procesar una fila de venta:', venta, e);
                    }
                });
            }
            
            // 4. Cargar Estado del Juego Local
            const estadoGuardado = localStorage.getItem('bingoGameState');
            if (estadoGuardado) {
                const estado = JSON.parse(estadoGuardado);
                numerosCantados = estado.cantados || [];
                juegoTerminado = estado.juegoTerminado || false;
                modoJuego = estado.modo || 'automatico';
                if (estado.patron) {
                    selectPatron.value = estado.patron;
                    selectPatron.dispatchEvent(new Event('change'));
                }
            }
            actualizarTodosDisplays();

        } catch (error) {
            console.error("Error al cargar estado:", error);
            alert("Error al cargar datos desde el servidor: " + error.message);
        }
    }

    // --- (Aquí van el resto de tus funciones: actualizarBotonVentas, guardarEstadoDelJuegoLocal, etc.) ---
    // (Asegúrate de que estén todas las funciones que ya tienes)

    // --- EVENT LISTENERS ---
    
    botonGuardarCartones.addEventListener('click', async () => {
        const todosLosCartonesEnPagina = document.querySelectorAll('#zona-de-cartones .carton-individual');
        if (todosLosCartonesEnPagina.length === 0) return alert("No hay cartones para guardar.");
        const cartonesParaGuardar = Array.from(todosLosCartonesEnPagina).map(cartonDiv => {
            const id = parseInt(cartonDiv.id.split('-')[1]);
            const cartonOriginal = cartonesEnJuego.find(c => c.id === id);
            return cartonOriginal ? { id: cartonOriginal.id, numbers: cartonOriginal.matriz } : null;
        }).filter(Boolean);

        if (cartonesParaGuardar.length === 0) return alert("No se encontraron datos válidos para guardar.");

        botonGuardarCartones.disabled = true;
        botonGuardarCartones.textContent = 'Guardando...';
        try {
            const response = await fetch(`${BACKEND_URL}/guardar-lote-cartones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cartonesParaGuardar) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Error del servidor");
            alert(result.message);
            
            // --- ¡CORRECCIÓN APLICADA! ---
            await cargarEstadoDelJuego(); // Actualizamos la vista dinámicamente

        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        } finally {
            botonGuardarCartones.disabled = false;
            botonGuardarCartones.textContent = 'Guardar Cartones en Almacén';
        }
    });

    botonBorrarCartones.addEventListener('click', async () => {
        if (confirm('¿BORRAR TODOS LOS CARTONES Y VENTAS? Esta acción es permanente.')) {
            try {
                const response = await fetch(`${BACKEND_URL}/todos-los-cartones`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'No se pudieron borrar.');
                alert(result.message);

                // --- ¡CORRECCIÓN APLICADA! ---
                await cargarEstadoDelJuego(); // Actualizamos la vista dinámicamente

            } catch (error) {
                console.error("Error al borrar:", error);
                alert(`Error: ${error.message}`);
            }
        }
    });

    botonResetearVenta.addEventListener('click', async () => {
        if (confirm('¿Estás seguro? Esta acción pondrá TODOS los cartones de nuevo a la venta.')) {
            try {
                const response = await fetch(`${BACKEND_URL}/resetear-venta`, { method: 'POST' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Error del servidor");
                alert(result.message);
                
                // --- ¡CORRECCIÓN APLICADA! ---
                await cargarEstadoDelJuego(); // Actualizamos la vista dinámicamente

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });
    
    botonMostrarGanadores.addEventListener('click', () => {
        if (!ganadoresInfo || ganadoresInfo.length === 0) return;
        if (indiceGanadorActual >= ganadoresInfo.length) {
            alert('Se han mostrado todos los cartones ganadores.');
            indiceGanadorActual = 0;
            return;
        }
        const ganador = ganadoresInfo[indiceGanadorActual];
        const cartonClonado = construirElementoCarton(ganador.id, ganador.matriz, ganador.isActive, 'vendido');
        const celdasClonadas = cartonClonado.querySelectorAll("td");
        celdasClonadas.forEach(celda => { const numero = celda.textContent === "★" ? "FREE" : parseInt(celda.textContent, 10); if (numerosCantados.includes(numero) || numero === "FREE") celda.classList.add("marcado"); });
        modalCartonContainer.innerHTML = "";
        modalCartonContainer.appendChild(cartonClonado);
        modalBackdrop.classList.remove("hidden");
        indiceGanadorActual++;
    });

    toggleVentasBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/toggle-ventas`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al cambiar estado de venta.');
            ventasEstanActivas = data.ventas_activas;
            actualizarBotonVentas();
            alert(data.message);
        } catch (error) {
            console.error('Error al cambiar estado de venta:', error);
            alert(`Error: ${error.message}`);
        }
    });
    
    botonCantar.addEventListener('click', cantarNumeroAutomatico);
    botonAnadirCarton.addEventListener('click', crearYAnadirCartonLocalmente);
    botonNuevaRonda.addEventListener('click', iniciarNuevaRonda);
    botonRetroceder.addEventListener('click', retrocederNumero);
    botonVerificarDuplicados.addEventListener('click', verificarDuplicados);
    modalCloseButton.addEventListener('click', () => modalBackdrop.classList.add('hidden'));
    modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) modalBackdrop.classList.add('hidden'); });
    
    selectPatron.addEventListener('change', () => {
        const patronSeleccionado = selectPatron.value;
        imagenPatron.src = `imagenes/patron_${patronSeleccionado}.png`; 
        guardarEstadoDelJuegoLocal(); 
    });
    
    botonModo.addEventListener('click', () => {
        if (juegoTerminado) return;
        modoJuego = (modoJuego === 'automatico') ? 'manual' : 'automatico';
        displayModo.textContent = `Modo: ${modoJuego.charAt(0).toUpperCase() + modoJuego.slice(1)}`;
        botonModo.textContent = `Cambiar a Modo ${modoJuego === 'automatico' ? 'Manual' : 'Automático'}`;
        botonCantar.disabled = (modoJuego === 'manual');
        contenedorNumerosMaestros.classList.toggle('modo-manual');
        guardarEstadoDelJuegoLocal();
    });
    
    contenedorNumerosMaestros.addEventListener('click', (event) => {
        if (modoJuego !== 'manual' || juegoTerminado) return;
        if (event.target.classList.contains('celda-maestra') && !event.target.classList.contains('cantado')) marcarNumero(parseInt(event.target.textContent, 10));
    });
    
    zonaDeCartones.addEventListener('change', async (event) => {
        if (!event.target.classList.contains('activar-carton-checkbox')) return;
        const checkbox = event.target;
        const idCarton = parseInt(checkbox.id.split('-')[2]);
        const carton = cartonesEnJuego.find(c => c.id === idCarton);
        if (!carton) return;
        checkbox.disabled = true;
        if (!checkbox.checked) {
            try {
                const response = await fetch(`${BACKEND_URL}/desactivar-carton/${idCarton}`, { method: 'POST' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'El servidor no pudo desactivar el cartón.');
                alert(result.message);
                cargarEstadoDelJuego();
            } catch (error) {
                console.error('Error al desactivar:', error);
                alert(`Error: ${error.message}`);
                checkbox.checked = true;
            } finally {
                checkbox.disabled = false;
            }
        } else {
            // Permitimos marcar visualmente, pero la activación real solo ocurre en la compra.
            carton.isActive = checkbox.checked;
            carton.elemento.classList.toggle('carton-inactivo', !checkbox.checked);
            checkbox.disabled = false;
        }
    });

    // --- INICIO DE LA APLICACIÓN ---
    crearTablaMaestra();
    cargarEstadoDelJuego();
});