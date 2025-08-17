// --- BARRERA DE SEGURIDAD (Mantenida como está) ---
/*
const contraseñaCorrecta = 'BingoGil2024*';
...
*/
// --- FIN DE LA BARRERA DE SEGURIDAD ---

// --- URL DEL SERVIDOR ---
const BACKEND_URL = 'https://bingo-backend-nmxa.onrender.com';

// --- CONSTANTES Y ELEMENTOS DEL DOM ---
const botonCantar = document.getElementById('boton-cantar');
// ... (resto de constantes sin cambios)
const zonaDeCartones = document.getElementById('zona-de-cartones');


// --- VARIABLES DEL JUEGO ---
let numerosCantados = [];
let modoJuego = 'automatico';
let juegoTerminado = false;
let cartonesEnJuego = []; // Esta será nuestra copia local de los datos de la BD
let ganadoresInfo = [];
let indiceGanadorActual = 0;

// --- Funciones de Guardado y Carga ---

// Guarda solo el estado de la partida (números cantados, etc.), no los cartones.
function guardarEstadoDelJuego() {
    const estado = {
        cantados: numerosCantados,
        juegoTerminado: juegoTerminado,
        modo: modoJuego,
        patron: selectPatron.value
    };
    localStorage.setItem('bingoGameState', JSON.stringify(estado));
}

// --- ¡FUNCIÓN COMPLETAMENTE NUEVA QUE USA EL BACKEND! ---
async function cargarEstadoDelJuego() {
    try {
        const response = await fetch(`${BACKEND_URL}/todos-los-cartones`);
        if (!response.ok) {
            throw new Error("No se pudo conectar con el servidor para cargar los cartones.");
        }
        const cartonesDesdeDB = await response.json();

        // Limpiamos el estado local y la vista
        cartonesEnJuego = [];
        zonaDeCartones.innerHTML = '';

        if (cartonesDesdeDB.length === 0) {
            // Si la base de datos está vacía, creamos un cartón inicial para empezar.
            crearYAnadirCartonLocalmente();
            return;
        }
        
        // Poblamos el estado local y la vista con los datos reales de la BD
        cartonesDesdeDB.forEach(carton => {
            // La BD guarda los números como JSON, necesitamos convertirlos
            const matrizNumeros = JSON.parse(carton.numeros);
            reconstruirCartonDesdeDatos(carton.id, matrizNumeros, carton.esta_activo, carton.status_venta);
        });

        // Cargamos el resto del estado del juego desde localStorage como antes
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
        console.error("Error al cargar el estado del juego:", error);
        alert(error.message);
    }
}


// --- Funciones de Configuración y Reinicio ---

// Iniciar Nueva Ronda AHORA solo limpia el estado del JUEGO, no los cartones.
function iniciarNuevaRonda() {
    numerosCantados = [];
    juegoTerminado = false;
    ganadoresInfo = [];
    indiceGanadorActual = 0;
    actualizarTodosDisplays();
    document.querySelectorAll('.carton-ganador').forEach(c => c.classList.remove('carton-ganador'));
    botonCantar.disabled = (modoJuego === 'manual');
    botonAnadirCarton.disabled = false;
    botonModo.disabled = false;
    botonMostrarGanadores.disabled = true;
    guardarEstadoDelJuego();
}

function crearTablaMaestra() {
    // ... (sin cambios)
}

// --- Funciones de Gestión de Cartones ---

function generarMatrizDeCarton() {
    // ... (sin cambios)
}

// Esta función ahora solo añade un cartón a la VISTA, no lo guarda.
function crearYAnadirCartonLocalmente() {
    const matriz = generarMatrizDeCarton();
    // Generamos un ID temporal negativo para diferenciarlo de los guardados en BD
    const idTemporal = -(cartonesEnJuego.length + 1);
    reconstruirCartonDesdeDatos(idTemporal, matriz, false, 'nuevo'); // Los nuevos cartones no están activos y su estado es 'nuevo'
}

function reconstruirCartonDesdeDatos(idCarton, matriz, isActive, statusVenta) {
    const cartonDiv = construirElementoCarton(idCarton, matriz, isActive, statusVenta);
    zonaDeCartones.appendChild(cartonDiv);
    cartonesEnJuego.push({ id: idCarton, matriz: matriz, elemento: cartonDiv, isActive: isActive });
}

function construirElementoCarton(idCarton, matriz, isActive, statusVenta) {
    const cartonDiv = document.createElement('div');
    cartonDiv.classList.add('carton-individual');
    if (!isActive) cartonDiv.classList.add('carton-inactivo');
    
    // --- ¡NUEVO! Añadimos clases visuales según el estado de la venta ---
    if (statusVenta === 'vendido') {
        cartonDiv.classList.add('carton-vendido-admin');
    } else if (statusVenta === 'reservado') {
        cartonDiv.classList.add('carton-reservado-admin');
    }
    
    cartonDiv.id = `carton-${idCarton}`;

    // La lógica del botón 'Marcar Vendido' la implementaremos después
    const textoBotonVendido = 'Marcar Vendido'; 

    let cartonHTML = `
        <h4>Cartón #${idCarton > 0 ? idCarton : 'Nuevo'}</h4>
        <table>...</table>
        <div class="controles-del-carton">
            <div class="control-activar-carton">
                <label for="activar-carton-${idCarton}">Juega:</label>
                <input type="checkbox" id="activar-carton-${idCarton}" class="activar-carton-checkbox" ${isActive ? 'checked' : ''}>
            </div>
            <button class="marcar-vendido-btn" data-id="${idCarton}">${textoBotonVendido}</button>
        </div>`;
    // ... (la lógica para generar el HTML de la tabla es la misma)

    return cartonDiv; // Devuelve el div construido
}


// --- Lógica de Juego y Event Listeners ---

function marcarNumero(numero){ /* ... (sin cambios) ... */ }
function cantarNumeroAutomatico(){ /* ... (sin cambios) ... */ }
function retrocederNumero(){ /* ... (sin cambios) ... */ }
function actualizarTodosDisplays(){ /* ... (sin cambios) ... */ }

// --- ¡FUNCIÓN MODIFICADA PARA SER PRECISA! ---
function verificarGanadores() {
    if (juegoTerminado) return;
    const patron = selectPatron.value;
    ganadoresInfo = [];
    
    // --- ¡CAMBIO CRÍTICO! ---
    // Filtramos los cartones basándonos en la propiedad 'isActive',
    // que ahora viene DIRECTAMENTE de la base de datos.
    const cartonesActivos = cartonesEnJuego.filter(carton => carton.isActive);

    cartonesActivos.forEach(carton => {
        // ... (toda la lógica del switch case para comprobar patrones se queda como está)
    });
    
    if (ganadoresInfo.length > 0) {
        // ... (la lógica para mostrar ganadores no cambia)
    }
}

function deshabilitarControlesFinDeJuego(){ /* ... (sin cambios) ... */ }
function verificarDuplicados(){ /* ... (sin cambios) ... */ }

// --- EVENT LISTENERS ---

botonAnadirCarton.addEventListener('click', crearYAnadirCartonLocalmente);
botonNuevaRonda.addEventListener('click', iniciarNuevaRonda);

// ¡El botón de Borrar Todos ahora se comunica con el backend! (Añadir la ruta al backend)
// Por ahora lo dejamos como está, pero la lógica ideal sería llamar a un endpoint DELETE.
botonBorrarCartones.addEventListener('click', () => { 
    if (confirm('¿Estás seguro de que quieres borrar todos los cartones? ¡Esta acción es permanente y afectará la base de datos!')) {
        // Aquí llamaríamos al backend para ejecutar 'DELETE FROM cartones'
        // y luego recargaríamos la página.
        alert("Funcionalidad de borrado en BD pendiente de implementar.");
    } 
});

// ... (El resto de event listeners como cantar, retroceder, mostrar ganadores, etc. no cambian)

// El checkbox de 'Juega' ahora debe comunicarse con el backend (Funcionalidad Futura)
zonaDeCartones.addEventListener('change', (event) => {
    if (event.target.classList.contains('activar-carton-checkbox')) {
        const checkbox = event.target;
        const idCarton = parseInt(checkbox.id.split('-')[2]);
        const carton = cartonesEnJuego.find(c => c.id === idCarton);
        if (carton) {
            carton.isActive = checkbox.checked;
            carton.elemento.classList.toggle('carton-inactivo', !checkbox.checked);
            
            // ¡IMPORTANTE! Esto solo cambia el estado visualmente.
            // Para hacerlo permanente, necesitamos una llamada a un nuevo endpoint.
            // Por ejemplo: fetch(`${BACKEND_URL}/toggle-estado-juego/${idCarton}`, { method: 'POST' });
            console.log(`Estado visual del cartón #${idCarton} cambiado a: ${carton.isActive}. Se necesita backend para persistir.`);
        }
    }
});


// --- Inicio de la Aplicación ---
crearTablaMaestra();
// ¡La función más importante ahora! Carga todo desde la BD al iniciar.
cargarEstadoDelJuego();