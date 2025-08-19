document.addEventListener('DOMContentLoaded', () => {
    // --- BARRERA DE SEGURIDAD ---
    /* ... (tu barrera de seguridad va aquí) ... */

    const BACKEND_URL = 'http://144.91.121.23:3000';

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

    // --- VARIABLES DEL JUEGO ---
    let numerosCantados = [];
    let modoJuego = 'automatico';
    let juegoTerminado = false;
    let cartonesEnJuego = [];
    let ganadoresInfo = [];
    let indiceGanadorActual = 0;

    // --- Funciones de Gestión con Backend ---
    async function cargarEstadoDelJuego() {
        try {
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
                    imagenPatron.src = `imagenes/patron_${estado.patron}.png`;
                }
            }
            actualizarTodosDisplays();
        } catch (error) {
            console.error("Error al cargar estado:", error);
            alert("Error al cargar los cartones desde la base de datos: " + error.message);
        }
    }

    function guardarEstadoDelJuegoLocal() {
        const estado = {
            cantados: numerosCantados,
            juegoTerminado: juegoTerminado,
            modo: modoJuego,
            patron: selectPatron.value
        };
        localStorage.setItem('bingoGameState', JSON.stringify(estado));
    }

    // --- Funciones de Creación y Visualización de Cartones ---
    function crearYAnadirCartonLocalmente() {
        const matriz = generarMatrizDeCarton();
        const maxId = cartonesEnJuego.reduce((max, c) => Math.max(c.id, max), 0);
        const nuevoId = maxId + 1;
        reconstruirCartonDesdeDatos(nuevoId, matriz, true, 'nuevo');
    }

    function reconstruirCartonDesdeDatos(id, matriz, isActive, statusVenta) {
        const cartonDiv = construirElementoCarton(id, matriz, isActive, statusVenta);
        zonaDeCartones.appendChild(cartonDiv);
        cartonesEnJuego.push({ id, matriz, elemento: cartonDiv, isActive });
    }

    function construirElementoCarton(id, matriz, isActive, statusVenta) {
        const cartonDiv = document.createElement('div');
        cartonDiv.classList.add('carton-individual');
        if (!isActive) cartonDiv.classList.add('carton-inactivo');
        if (statusVenta === 'vendido') cartonDiv.classList.add('carton-vendido-admin');
        if (statusVenta === 'reservado') cartonDiv.classList.add('carton-reservado-admin');
        cartonDiv.id = `carton-${id}`;
        let cartonHTML = `<h4>Cartón #${id}</h4><table><thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>`;
        for (let i = 0; i < 5; i++) {
            cartonHTML += '<tr>';
            for (let j = 0; j < 5; j++) {
                const valor = matriz[i][j];
                cartonHTML += `<td>${valor === 'FREE' ? '★' : valor}</td>`;
            }
            cartonHTML += '</tr>';
        }
        cartonHTML += `</tbody></table><div class="controles-del-carton"><div class="control-activar-carton"><label for="activar-carton-${id}">Juega:</label><input type="checkbox" id="activar-carton-${id}" class="activar-carton-checkbox" ${isActive ? 'checked' : ''}></div><button class="marcar-vendido-btn" data-id="${id}">Vendido</button></div>`;
        cartonDiv.innerHTML = cartonHTML;
        return cartonDiv;
    }

    function generarMatrizDeCarton() {
        const numerosPorColumna = { B: { min: 1, max: 15, numeros: [] }, I: { min: 16, max: 30, numeros: [] }, N: { min: 31, max: 45, numeros: [] }, G: { min: 46, max: 60, numeros: [] }, O: { min: 61, max: 75, numeros: [] } };
        let matriz = Array(5).fill(null).map(() => Array(5));
        for (let i = 0; i < 5; i++) { const letra = Object.keys(numerosPorColumna)[i]; for (let j = 0; j < 5; j++) { if (i === 2 && j === 2) { matriz[j][i] = 'FREE'; } else { let numero; const columna = numerosPorColumna[letra]; do { numero = Math.floor(Math.random() * (columna.max - columna.min + 1)) + columna.min; } while (columna.numeros.includes(numero)); columna.numeros.push(numero); matriz[j][i] = numero; } } }
        return matriz;
    }

    // --- Lógica de Juego ---
    function crearTablaMaestra() { /* ... (código sin cambios) ... */ }
    function iniciarNuevaRonda() { /* ... (código sin cambios) ... */ }
    function marcarNumero(numero){ /* ... (código sin cambios) ... */ }
    function cantarNumeroAutomatico(){ /* ... (código sin cambios) ... */ }
    function retrocederNumero(){ /* ... (código sin cambios) ... */ }
    function actualizarTodosDisplays(){ /* ... (código sin cambios) ... */ }
    function verificarGanadores() { /* ... (código sin cambios) ... */ }
    function deshabilitarControlesFinDeJuego(){ /* ... (código sin cambios) ... */ }
    function verificarDuplicados(){ /* ... (código sin cambios) ... */ }

    // --- EVENT LISTENERS ---
    
    botonGuardarCartones.addEventListener('click', async () => {
        const todosLosCartonesEnPagina = document.querySelectorAll('#zona-de-cartones .carton-individual');
        if (todosLosCartonesEnPagina.length === 0) {
            return alert("No hay cartones para guardar.");
        }
        const cartonesParaGuardar = Array.from(todosLosCartonesEnPagina).map(cartonDiv => {
            const id = parseInt(cartonDiv.id.split('-')[1]);
            const cartonOriginal = cartonesEnJuego.find(c => c.id === id);
            if (cartonOriginal) {
                return { id: cartonOriginal.id, numbers: cartonOriginal.matriz };
            }
            return null;
        }).filter(Boolean); // Filtramos cualquier nulo si no se encuentra el cartón

        if (cartonesParaGuardar.length === 0) {
             return alert("No se encontraron datos válidos para guardar.");
        }

        botonGuardarCartones.disabled = true;
        botonGuardarCartones.textContent = 'Guardando...';
        try {
            const response = await fetch(`${BACKEND_URL}/guardar-lote-cartones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cartonesParaGuardar)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Error del servidor");
            alert(result.message);
            window.location.reload();
        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        } finally {
            botonGuardarCartones.disabled = false;
            botonGuardarCartones.textContent = 'Guardar Cartones en Almacén';
        }
    });

    botonBorrarCartones.addEventListener('click', async () => {
        if (confirm('¿BORRAR TODOS LOS CARTONES DE LA VENTA ACTUAL? Esta acción es permanente.')) {
            try {
                const response = await fetch(`${BACKEND_URL}/todos-los-cartones`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'No se pudieron borrar.');
                alert(result.message);
                window.location.reload();
            } catch (error) {
                console.error("Error al borrar:", error);
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
        // ... (resto de la lógica para mostrar el clon)
        indiceGanadorActual++;
    });
    
    // ... (resto de tus event listeners: cantar, añadir, etc.)

    // --- INICIO DE LA APLICACIÓN ---
    crearTablaMaestra();
    cargarEstadoDelJuego();
});