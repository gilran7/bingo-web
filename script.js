document.addEventListener('DOMContentLoaded', () => {
    // --- BARRERA DE SEGURIDAD ---
    /* ... (tu barrera de seguridad va aquí) ... */

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
            const estadoResponse = await fetch(`${BACKEND_URL}/estado-ventas`);
            if (!estadoResponse.ok) throw new Error('No se pudo obtener el estado de la venta.');
            const estadoData = await estadoResponse.json();
            ventasEstanActivas = estadoData.ventas_activas;
            actualizarBotonVentas();

            const response = await fetch(`${BACKEND_URL}/todos-los-cartones`);
            if (!response.ok) throw new Error("No se pudo conectar con el servidor.");
            const cartonesDesdeDB = await response.json();
            
            cartonesEnJuego = [];
            zonaDeCartones.innerHTML = '';
            
            cartonesDesdeDB.forEach(carton => {
                const matrizNumeros = typeof carton.numeros === 'string' ? JSON.parse(carton.numeros) : carton.numeros;
                reconstruirCartonDesdeDatos(carton.id, matrizNumeros, carton.esta_activo, carton.status_venta);
            });
            
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
            alert("Error al cargar los cartones desde la base de datos: " + error.message);
        }
    }

    // --- FUNCIONES DE INTERFAZ DE USUARIO ---
    function actualizarBotonVentas() {
        if (ventasEstanActivas) {
            toggleVentasBtn.textContent = 'Cerrar Venta';
            toggleVentasBtn.style.backgroundColor = '#f44336';
            
            botonCantar.disabled = true;
            botonModo.disabled = true;
            botonRetroceder.disabled = true;
            tablaMaestra.classList.add('bloqueado');
            
            botonCantar.title = 'Cierra la venta para poder iniciar el juego.';
            botonModo.title = 'Cierra la venta para poder cambiar de modo.';
        } else {
            toggleVentasBtn.textContent = 'Abrir Venta';
            toggleVentasBtn.style.backgroundColor = '#28a745';
            
            tablaMaestra.classList.remove('bloqueado');
            
            if (!juegoTerminado) {
                botonCantar.disabled = (modoJuego === 'manual');
                botonModo.disabled = false;
                botonRetroceder.disabled = (numerosCantados.length === 0);
                botonCantar.title = '';
                botonModo.title = '';
            }
        }
    }

    function guardarEstadoDelJuegoLocal() {
        const estado = { cantados: numerosCantados, juegoTerminado: juegoTerminado, modo: modoJuego, patron: selectPatron.value };
        localStorage.setItem('bingoGameState', JSON.stringify(estado));
    }

    // --- FUNCIONES DE CREACIÓN DE CARTONES ---
    function crearYAnadirCartonLocalmente() { /* ...código sin cambios... */ }
    function reconstruirCartonDesdeDatos(id, matriz, isActive, statusVenta) { /* ...código sin cambios... */ }
    function construirElementoCarton(id, matriz, isActive, statusVenta) { /* ...código sin cambios... */ }
    function generarMatrizDeCarton() { /* ...código sin cambios... */ }

    // --- LÓGICA DE JUEGO ---
    function crearTablaMaestra() { /* ...código sin cambios... */ }

    function iniciarNuevaRonda() {
        numerosCantados = [];
        juegoTerminado = false;
        ganadoresInfo = [];
        indiceGanadorActual = 0;
        localStorage.removeItem('bingoGameState');
        actualizarTodosDisplays();
        document.querySelectorAll('.carton-ganador').forEach(c => c.classList.remove('carton-ganador'));
        botonMostrarGanadores.disabled = true;
        // ¡CORRECCIÓN! Volvemos a evaluar el estado de los botones
        actualizarBotonVentas(); 
    }

    function marcarNumero(numero) { /* ...código sin cambios... */ }
    function cantarNumeroAutomatico() { /* ...código sin cambios... */ }
    function retrocederNumero() { /* ...código sin cambios... */ }
    function actualizarTodosDisplays() { /* ...código sin cambios... */ }

    function verificarGanadores() {
        if (juegoTerminado) return;
        const patronSeleccionado = selectPatron.value;
        ganadoresInfo = [];
        const cartonesActivos = cartonesEnJuego.filter(carton => carton.isActive);

        cartonesActivos.forEach(carton => {
            const celdas = Array.from(carton.elemento.querySelectorAll("td"));
            const estaMarcada = (index) => celdas[index].classList.contains('marcado');
            let esGanador = false;

            const patrones = {
                'cartonlleno': Array.from({ length: 25 }, (_, i) => i),
                'lnormal': [0, 5, 10, 15, 20, 21, 22, 23, 24],
                '4esquinas': [0, 4, 20, 24],
                'x': [0, 4, 6, 8, 12, 16, 18, 20, 24],
                'cruzgrande': [2, 7, 10, 11, 12, 13, 14, 17, 22],
                'bordecarton': [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24],
                'fila_1': [0, 5, 10, 15, 20],
                'fila_2': [1, 6, 11, 16, 21],
                'fila_3': [2, 7, 12, 17, 22],
                'fila_4': [3, 8, 13, 18, 23],
                'fila_5': [4, 9, 14, 19, 24],
                'columna_1': [0, 1, 2, 3, 4],
                'columna_2': [5, 6, 7, 8, 9],
                'columna_3': [10, 11, 12, 13, 14],
                'columna_4': [15, 16, 17, 18, 19],
                'columna_5': [20, 21, 22, 23, 24],
                'linvertida': [4, 9, 14, 19, 24, 20, 21, 22, 23],
                // ¡PATRONES CORREGIDOS!
                'e': [0, 1, 2, 3, 4, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24],
                't': [0, 5, 10, 15, 20, 12],
                'cruzpequeña': [7, 11, 12, 13, 17]
            };

            if (patronSeleccionado === 'fila') {
                const filas = ['fila_1', 'fila_2', 'fila_3', 'fila_4', 'fila_5'];
                for (const fila of filas) { if (patrones[fila].every(estaMarcada)) { esGanador = true; break; } }
            } else if (patronSeleccionado === 'columna') {
                const columnas = ['columna_1', 'columna_2', 'columna_3', 'columna_4', 'columna_5'];
                for (const columna of columnas) { if (patrones[columna].every(estaMarcada)) { esGanador = true; break; } }
            } else {
                const indicesDelPatron = patrones[patronSeleccionado];
                if (indicesDelPatron) { esGanador = indicesDelPatron.every(estaMarcada); }
            }

            if (esGanador) { ganadoresInfo.push(carton); }
        });

        if (ganadoresInfo.length > 0) { /* ...código sin cambios... */ }
    }

    function deshabilitarControlesFinDeJuego() { /* ...código sin cambios... */ }
    function verificarDuplicados() { /* ...código sin cambios... */ }

    // --- EVENT LISTENERS ---
    
    botonGuardarCartones.addEventListener('click', async () => { /* ...código sin cambios... */ });
    botonBorrarCartones.addEventListener('click', async () => { /* ...código sin cambios... */ });
    botonResetearVenta.addEventListener('click', async () => { /* ...código sin cambios... */ });
    botonMostrarGanadores.addEventListener('click', () => { /* ...código sin cambios... */ });
    toggleVentasBtn.addEventListener('click', async () => { /* ...código sin cambios... */ });
    
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
            }
        } else {
            carton.isActive = checkbox.checked;
            carton.elemento.classList.toggle('carton-inactivo', !checkbox.checked);
        }
        checkbox.disabled = false;
    });

    // --- INICIO DE LA APLICACIÓN ---
    crearTablaMaestra();
    cargarEstadoDelJuego();
});