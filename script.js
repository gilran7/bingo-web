document.addEventListener('DOMContentLoaded', () => {
    // --- BARRERA DE SEGURIDAD ---
    /*
    const contraseñaCorrecta = 'BingoGil2024*';
    let accesoPermitido = false;
    // ... (código de la barrera de seguridad va aquí)
    */
    // --- FIN BARRERA DE SEGURIDAD ---

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
        // Hacemos todas las peticiones al backend en paralelo para máxima eficiencia
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

        // --- 1. Procesar Estado de Venta ---
        ventasEstanActivas = estadoData.ventas_activas;
        actualizarBotonVentas();

        // --- 2. Procesar y Dibujar Cartones ---
        cartonesEnJuego = [];
        zonaDeCartones.innerHTML = '';
        cartonesDesdeDB.forEach(carton => {
            const matrizNumeros = typeof carton.numeros === 'string' ? JSON.parse(carton.numeros) : carton.numeros;
            reconstruirCartonDesdeDatos(carton.id, matrizNumeros, carton.esta_activo, carton.status_venta);
        });

        // --- 3. Procesar y Dibujar la Tabla de Ventas ---
        /*
        const tbody = document.getElementById('cuerpo-tabla-ventas');
        tbody.innerHTML = '';
        ventas.forEach(venta => {
            const fila = `
                <tr>
                    <td>${new Date(venta.fecha_venta).toLocaleString()}</td>
                    <td>${venta.nombre_comprador}</td>
                    <td>${venta.whatsapp}</td>
                    <td>${venta.info_transaccion}</td>
                    <td>${JSON.parse(venta.cartones_comprados).join(', ')}</td>
                    <td><a href="${venta.comprobante_url}" target="_blank" rel="noopener noreferrer">Ver</a></td>
                </tr>
            `;
            tbody.innerHTML += fila;
        });
        */
        // --- 4. Cargar Estado del Juego (LocalStorage) ---
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

    // --- LÓGICA DE JUEGO ---
    function crearTablaMaestra() {
        contenedorNumerosMaestros.innerHTML = '';
        contenedorColumnasLetras.innerHTML = '';
        const letras = ['B', 'I', 'N', 'G', 'O'];
        letras.forEach((letra, index) => {
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('letra-maestra-header');
            headerDiv.textContent = letra;
            contenedorColumnasLetras.appendChild(headerDiv);
            const columnaDiv = document.createElement('div');
            columnaDiv.classList.add('columna-maestra');
            const min = index * 15 + 1;
            const max = min + 14;
            for (let i = min; i <= max; i++) {
                const celda = document.createElement('div');
                celda.classList.add('celda-maestra');
                celda.textContent = i;
                celda.id = `maestra-${i}`;
                columnaDiv.appendChild(celda);
            }
            contenedorNumerosMaestros.appendChild(columnaDiv);
        });
    }

    function iniciarNuevaRonda() {
        numerosCantados = [];
        juegoTerminado = false;
        ganadoresInfo = [];
        indiceGanadorActual = 0;
        localStorage.removeItem('bingoGameState');
        actualizarTodosDisplays();
        document.querySelectorAll('.carton-ganador').forEach(c => c.classList.remove('carton-ganador'));
        botonMostrarGanadores.disabled = true;
        actualizarBotonVentas();
    }

    function marcarNumero(numero) {
        if (numerosCantados.includes(numero) || juegoTerminado) return;
        numerosCantados.push(numero);
        actualizarTodosDisplays();
        guardarEstadoDelJuegoLocal();
        verificarGanadores();
    }

    function cantarNumeroAutomatico() {
        if (numerosCantados.length >= 75) return;
        let nuevoNumero;
        do { nuevoNumero = Math.floor(Math.random() * 75) + 1; } while (numerosCantados.includes(nuevoNumero));
        marcarNumero(nuevoNumero);
    }

    function retrocederNumero() {
        if (numerosCantados.length === 0 || juegoTerminado) return;
        numerosCantados.pop();
        actualizarTodosDisplays();
        guardarEstadoDelJuegoLocal();
    }

    function actualizarTodosDisplays() {
        document.querySelectorAll(".celda-maestra.cantado").forEach(c => c.classList.remove("cantado"));
        document.querySelectorAll(".carton-individual td.marcado").forEach(c => c.classList.remove("marcado"));
        document.querySelectorAll(".carton-individual td").forEach(td => { if (td.textContent === '★') td.classList.add('marcado'); });
        listaHistorial.innerHTML = "";
        numerosCantados.forEach(num => {
            document.getElementById(`maestra-${num}`)?.classList.add("cantado");
            cartonesEnJuego.forEach(carton => {
                for (let i = 0; i < 5; i++) {
                    for (let j = 0; j < 5; j++) {
                        if (carton.matriz[i][j] === num) {
                            carton.elemento.querySelector("tbody").rows[i].cells[j].classList.add("marcado");
                        }
                    }
                }
            });
        });
        const ultimos5 = numerosCantados.slice(-5).reverse();
        ultimos5.forEach(num => {
            const itemHistorial = document.createElement("div");
            itemHistorial.className = "numero-historial";
            itemHistorial.textContent = num;
            listaHistorial.appendChild(itemHistorial);
        });
        const ultimoNumero = numerosCantados.length > 0 ? numerosCantados[numerosCantados.length - 1] : "--";
        numeroCantadoDisplay.textContent = ultimoNumero;
        botonRetroceder.disabled = numerosCantados.length === 0 || juegoTerminado;
    }

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
            'x': [0, 6, 12, 18, 24, 4, 8, 16, 20],
            'cruzgrande': [2, 7, 10, 11, 12, 13, 14, 17, 22],
            'bordecarton': [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24],
            'fila_1': [0, 1, 2, 3, 4],
            'fila_2': [5, 6, 7, 8, 9],
            'fila_3': [10, 11, 12, 13, 14],
            'fila_4': [15, 16, 17, 18, 19],
            'fila_5': [20, 21, 22, 23, 24],
            'columna_1': [0, 5, 10, 15, 20],
            'columna_2': [1, 6, 11, 16, 21],
            'columna_3': [2, 7, 12, 17, 22],
            'columna_4': [3, 8, 13, 18, 23],
            'columna_5': [4, 9, 14, 19, 24],
            'linvertida': [20, 21, 22, 23, 24, 4, 9, 14, 19],
            'cruzpequeña': [7, 11, 12, 13, 17],
            't': [0, 1, 2, 3, 4, 7, 12, 17, 22],
            // --- ¡PATRÓN 'E' FINALMENTE CORREGIDO! ---
            'e': [0, 5, 10, 15, 20, 1, 11, 21] 
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

    if (ganadoresInfo.length > 0) {
        deshabilitarControlesFinDeJuego();
        const idsGanadores = ganadoresInfo.map(c => c.id);
        idsGanadores.forEach(id => { document.getElementById(`carton-${id}`)?.classList.add("carton-ganador"); });
        botonMostrarGanadores.disabled = false;
        setTimeout(() => { alert(`¡BINGO! Ganador(es) con el patrón "${patronSeleccionado.toUpperCase()}": Cartón #${idsGanadores.join(", #")}`); }, 100);
    }
}

    function deshabilitarControlesFinDeJuego() {
        juegoTerminado = true;
        botonCantar.disabled = true;
        botonAnadirCarton.disabled = true;
        botonModo.disabled = true;
        botonRetroceder.disabled = true;
        contenedorNumerosMaestros.classList.remove('modo-manual');
    }

    function verificarDuplicados() {
        const duplicados = [];
        const matricesString = cartonesEnJuego.map(carton => JSON.stringify(carton.matriz.flat().filter(n => n !== "FREE").sort((a, b) => a - b)));
        for (let i = 0; i < matricesString.length; i++) { for (let j = i + 1; j < matricesString.length; j++) { if (matricesString[i] === matricesString[j]) { duplicados.push(`- Cartón #${cartonesEnJuego[i].id} y Cartón #${cartonesEnJuego[j].id}`); } } }
        if (duplicados.length > 0) { alert(`¡Se encontraron cartones repetidos!\n\n${[...new Set(duplicados)].join("\n")}`); } else { alert("No se encontraron cartones repetidos."); }
    }

// Llama a esta nueva función al final de cargarEstadoDelJuego
async function cargarEstadoDelJuego() {
    // ... (todo el código existente de esta función)
    // Al final, justo antes del 'catch', añade esta línea:
    await cargarVentas(); 
}

    // --- EVENT LISTENERS ---
    
    botonGuardarCartones.addEventListener('click', async () => {
        const todosLosCartonesEnPagina = document.querySelectorAll('#zona-de-cartones .carton-individual');
        if (todosLosCartonesEnPagina.length === 0) return alert("No hay cartones para guardar.");
        const cartonesParaGuardar = Array.from(todosLosCartonesEnPagina).map(cartonDiv => { const id = parseInt(cartonDiv.id.split('-')[1]); const cartonOriginal = cartonesEnJuego.find(c => c.id === id); return cartonOriginal ? { id: cartonOriginal.id, numbers: cartonOriginal.matriz } : null; }).filter(Boolean);
        if (cartonesParaGuardar.length === 0) return alert("No se encontraron datos válidos para guardar.");
        botonGuardarCartones.disabled = true;
        botonGuardarCartones.textContent = 'Guardando...';
        try {
            const response = await fetch(`${BACKEND_URL}/guardar-lote-cartones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cartonesParaGuardar) });
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

    botonResetearVenta.addEventListener('click', async () => {
        if (confirm('¿Estás seguro? Esta acción pondrá TODOS los cartones (incluidos los vendidos y reservados) de nuevo a la venta.')) {
            try {
                const response = await fetch(`${BACKEND_URL}/resetear-venta`, { method: 'POST' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Error del servidor");
                alert(result.message);
                window.location.reload();
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