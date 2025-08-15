// --- BARRERA DE SEGURIDAD (SIN CAMBIOS) --- 
const contraseñaCorrecta = 'BingoGil2024*'; 
let accesoPermitido = false;
if (sessionStorage.getItem('accesoBingoAdmin') === 'concedido') {
    accesoPermitido = true;
} else {
    let intentos = 3;
    while (intentos > 0) {
        let contraseñaIngresada = prompt(`Por favor, ingresa la contraseña de administrador. Tienes ${intentos} intentos.`);
        if (contraseñaIngresada === null) break;
        if (contraseñaIngresada === contraseñaCorrecta) {
            sessionStorage.setItem('accesoBingoAdmin', 'concedido');
            accesoPermitido = true;
            break;
        } else {
            intentos--;
            alert(intentos > 0 ? `Contraseña incorrecta. Te quedan ${intentos} intentos.` : 'Has agotado tus intentos. Acceso denegado.');
        }
    }
}
if (!accesoPermitido) {
    document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px; font-family: sans-serif;">ACCESO DENEGADO</h1>';
    throw new Error("Acceso denegado por contraseña incorrecta."); 
}

// --- CONSTANTES Y ELEMENTOS DEL DOM ---
const botonCantar = document.getElementById('boton-cantar');
const botonNuevaRonda = document.getElementById('boton-nueva-ronda');
const botonAnadirCarton = document.getElementById('boton-anadir-carton');
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
const botonGuardarCartones = document.getElementById('boton-guardar-cartones'); // NUEVO

// --- VARIABLES DEL JUEGO ---
let numerosCantados = [];
let modoJuego = 'automatico';
let juegoTerminado = false;
let cartonesEnJuego = [];
let ganadoresInfo = [];
let indiceGanadorActual = 0;
let reservas = new Map(); 

// --- FUNCIONES DE API ---
async function obtenerReservasAdmin() {
    try {
        const response = await fetch('/.netlify/functions/get-reservations');
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("No se pudieron cargar las reservas:", error);
        return [];
    }
}

async function enviarReservaAdmin(idCarton) {
    const formData = new FormData();
    formData.append('form-name', 'reservas-bingo');
    formData.append('cartonId', idCarton);
    formData.append('timestamp', Date.now().toString());
    await fetch('/', { method: 'POST', body: new URLSearchParams(formData) });
}

async function liberarReservaAdmin(submissionId) {
    await fetch('/.netlify/functions/release-reservation', {
        method: 'POST',
        body: JSON.stringify({ submission_id: submissionId })
    });
}

// --- Funciones de Guardado y Carga ---
function guardarEstadoDelJuego() {
    const estado = {
        cartones: cartonesEnJuego.map(carton => ({ 
            id: carton.id, 
            matriz: carton.matriz, 
            isActive: carton.isActive
        })),
        cantados: numerosCantados,
        juegoTerminado: juegoTerminado,
        modo: modoJuego,
        ganadores: ganadoresInfo.map(ganador => ganador.id),
        patron: selectPatron.value
    };
    localStorage.setItem('bingoGameState', JSON.stringify(estado));
}

async function cargarEstadoDelJuego() {
    const submissions = await obtenerReservasAdmin();
    reservas.clear();
    submissions.forEach(sub => {
        reservas.set(parseInt(sub.data.cartonId), sub.id);
    });

    const estadoGuardado = localStorage.getItem('bingoGameState');
    if (estadoGuardado) {
        const estado = JSON.parse(estadoGuardado);
        cartonesEnJuego = [];
        zonaDeCartones.innerHTML = '';
        estado.cartones.forEach(datosCarton => {
            reconstruirCartonDesdeDatos(datosCarton.id, datosCarton.matriz, datosCarton.isActive);
        });
        numerosCantados = estado.cantados || [];
        juegoTerminado = estado.juegoTerminado || false;
        modoJuego = estado.modo || 'automatico';
        ganadoresInfo = [];
        if (estado.ganadores && estado.ganadores.length > 0) {
            estado.ganadores.forEach(idGanador => {
                const cartonGanador = cartonesEnJuego.find(c => c.id === idGanador);
                if (cartonGanador) ganadoresInfo.push(cartonGanador);
            });
            botonMostrarGanadores.disabled = false;
        }
        if (estado.patron) { 
            selectPatron.value = estado.patron; 
            imagenPatron.src = `imagenes/patron_${estado.patron}.png`; 
        }
        actualizarTodosDisplays();
        if (juegoTerminado) {
            deshabilitarControlesFinDeJuego();
            ganadoresInfo.forEach(ganador => { 
                document.getElementById(`carton-${ganador.id}`)?.classList.add('carton-ganador'); 
            });
        } else {
            displayModo.textContent = `Modo: ${modoJuego.charAt(0).toUpperCase() + modoJuego.slice(1)}`;
            botonModo.textContent = `Cambiar a Modo ${modoJuego === 'automatico' ? 'Manual' : 'Automático'}`;
            botonCantar.disabled = (modoJuego === 'manual');
            if (modoJuego === 'manual') contenedorNumerosMaestros.classList.add('modo-manual'); else contenedorNumerosMaestros.classList.remove('modo-manual');
        }
    } else {
        reiniciarSistemaCompleto();
    }
}

// --- Función Guardar Cartones Corregida ---
async function guardarCartones() {
    try {
        const cards = cartonesEnJuego.map(c => c.matriz);
        const response = await fetch("/.netlify/functions/save-cards", { 
            method: "POST",
            body: JSON.stringify({ cards }),
        });

        const data = await response.json();

        if (response.ok) {
            alert(`✅ ${data.message}`);
        } else {
            alert(`❌ Hubo un error al guardar los cartones. Detalles: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        alert(`❌ Hubo un error al guardar los cartones. Detalles: ${error}`);
    }
}

// --- Resto de tu script.js ---
// (Todas las funciones, listeners y lógica de cartones, patrones, modal, historial, etc. quedan igual que tu código original)

botonGuardarCartones.addEventListener('click', guardarCartones); // Listener nuevo

// --- Inicio de la Aplicación ---
crearTablaMaestra();
cargarEstadoDelJuego();
