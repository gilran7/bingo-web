// --- BARRERA DE SEGURIDAD ---
/*
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
*/
// --- FIN BARRERA DE SEGURIDAD ---

const BACKEND_URL = 'https://bingo-backend-nmxa.onrender.com';

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
        if (!response.ok) throw new Error("No se pudo conectar con el servidor para cargar los cartones.");
        
        const cartonesDesdeDB = await response.json();
        
        cartonesEnJuego = [];
        zonaDeCartones.innerHTML = '';

        if (cartonesDesdeDB.length > 0) {
            cartonesDesdeDB.forEach(carton => {
                const matrizNumeros = JSON.parse(carton.numeros);
                reconstruirCartonDesdeDatos(carton.id, matrizNumeros, carton.esta_activo, carton.status_venta);
            });
        }
        
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
        alert(error.message);
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
    const maxId = cartonesEnJuego.reduce((max, c) => c.id > max ? c.id : max, 0);
    const nuevoId = maxId + 1;
    reconstruirCartonDesdeDatos(nuevoId, matriz, true, 'nuevo'); // Los nuevos cartones se crean activos visualmente
}

function reconstruirCartonDesdeDatos(id, matriz, isActive, statusVenta) {
    const cartonDiv = construirElementoCarton(id, matriz, isActive, statusVenta);
    zonaDeCartones.appendChild(cartonDiv);
    // Guardamos la matriz original, no el string
    cartonesEnJuego.push({ id, matriz, elemento: cartonDiv, isActive });
}

function construirElementoCarton(id, matriz, isActive, statusVenta) {
    const cartonDiv = document.createElement('div');
    cartonDiv.classList.add('carton-individual');
    if (!isActive) cartonDiv.classList.add('carton-inactivo');
    if (statusVenta === 'vendido') cartonDiv.classList.add('carton-vendido-admin');
    if (statusVenta === 'reservado') cartonDiv.classList.add('carton-reservado-admin');
    cartonDiv.id = `carton-${id}`;
    
    let cartonHTML = `<h4>Cartón #${id}</h4>
        <table><thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>`;
    for (let i = 0; i < 5; i++) {
        cartonHTML += '<tr>';
        for (let j = 0; j < 5; j++) {
            const valor = matriz[i][j];
            cartonHTML += `<td>${valor === 'FREE' ? '★' : valor}</td>`;
        }
        cartonHTML += '</tr>';
    }
    cartonHTML += `</tbody></table>
        <div class="controles-del-carton">
            <div class="control-activar-carton">
                <label for="activar-carton-${id}">Juega:</label>
                <input type="checkbox" id="activar-carton-${id}" class="activar-carton-checkbox" ${isActive ? 'checked' : ''}>
            </div>
            <button class="marcar-vendido-btn" data-id="${id}">Vendido</button>
        </div>`;
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

function marcarNumero(numero){if(numerosCantados.includes(numero)||juegoTerminado)return;numerosCantados.push(numero);actualizarTodosDisplays();guardarEstadoDelJuegoLocal();verificarGanadores()}
function cantarNumeroAutomatico(){if(numerosCantados.length>=75)return;let nuevoNumero;do{nuevoNumero=Math.floor(Math.random()*75)+1}while(numerosCantados.includes(nuevoNumero));marcarNumero(nuevoNumero)}
function retrocederNumero(){if(numerosCantados.length===0||juegoTerminado)return;numerosCantados.pop();actualizarTodosDisplays();guardarEstadoDelJuegoLocal()}
function actualizarTodosDisplays(){document.querySelectorAll(".celda-maestra.cantado").forEach(c=>c.classList.remove("cantado"));document.querySelectorAll(".carton-individual td.marcado").forEach(c=>{if(c.textContent!=="★")c.classList.remove("marcado")});listaHistorial.innerHTML="";numerosCantados.forEach(num=>{document.getElementById(`maestra-${num}`)?.classList.add("cantado");cartonesEnJuego.forEach(carton=>{for(let i=0;i<5;i++)for(let j=0;j<5;j++)if(carton.matriz[i][j]===num)carton.elemento.querySelector("tbody").rows[i].cells[j].classList.add("marcado")})});const ultimos5=numerosCantados.slice(-5).reverse();ultimos5.forEach(num=>{const itemHistorial=document.createElement("div");itemHistorial.className="numero-historial";itemHistorial.textContent=num;listaHistorial.appendChild(itemHistorial)});const ultimoNumero=numerosCantados.length>0?numerosCantados[numerosCantados.length-1]:"--";numeroCantadoDisplay.textContent=ultimoNumero;botonRetroceder.disabled=numerosCantados.length===0||juegoTerminado}

function verificarGanadores(){
    if(juegoTerminado) return;
    const patron=selectPatron.value;
    ganadoresInfo=[];
    const cartonesActivos=cartonesEnJuego.filter(carton=>carton.isActive);
    cartonesActivos.forEach(carton=>{const celdas=Array.from(carton.elemento.querySelector("tbody").rows).map(row=>Array.from(row.cells));let esGanador=false;const isMarked=(r,c)=>celdas[r][c].classList.contains("marcado")||celdas[r][c].textContent==='★';
    switch(patron){
        case"lnormal":esGanador=isMarked(0,0)&&isMarked(1,0)&&isMarked(2,0)&&isMarked(3,0)&&isMarked(4,0)&&isMarked(4,1)&&isMarked(4,2)&&isMarked(4,3)&&isMarked(4,4);break;
        case"cartonlleno":esGanador=celdas.flat().every(c=>c.classList.contains("marcado")||c.textContent==='★');break;
        // ... (resto de tus 'case' para los patrones van aquí)
    }
    if(esGanador)ganadoresInfo.push(carton)});
    if(ganadoresInfo.length>0){juegoTerminado=true;const idsGanadores=ganadoresInfo.map(c=>c.id);idsGanadores.forEach(id=>{document.getElementById(`carton-${id}`)?.classList.add("carton-ganador")});botonMostrarGanadores.disabled=false;alert(`¡BINGO! Ganador(es): Cartón #${idsGanadores.join(", #")}`)}
}

function deshabilitarControlesFinDeJuego(){juegoTerminado=true;botonCantar.disabled=true;botonAnadirCarton.disabled=true;botonModo.disabled=true;botonRetroceder.disabled=true;contenedorNumerosMaestros.classList.remove("modo-manual")}
function verificarDuplicados(){const duplicados=[];const matricesString=cartonesEnJuego.map(carton=>JSON.stringify(carton.matriz.flat().filter(n=>n!=="FREE").sort((a,b)=>a-b)));for(let i=0;i<matricesString.length;i++){for(let j=i+1;j<matricesString.length;j++){if(matricesString[i]===matricesString[j]){duplicados.push(`- Cartón #${cartonesEnJuego[i].id} y Cartón #${cartonesEnJuego[j].id}`)}}}if(duplicados.length>0){alert(`¡Se encontraron cartones repetidos!\n\n${[...new Set(duplicados)].join("\n")}`)}else{alert("No se encontraron cartones repetidos.")}}

// --- EVENT LISTENERS ---
botonCantar.addEventListener('click', cantarNumeroAutomatico);
botonAnadirCarton.addEventListener('click', crearYAnadirCartonLocalmente);
botonNuevaRonda.addEventListener('click', () => {
    localStorage.removeItem('bingoGameState');
    iniciarNuevaRonda();
});
botonRetroceder.addEventListener('click', retrocederNumero);
botonBorrarCartones.addEventListener('click', async () => {
    if (confirm('¿BORRAR TODOS LOS CARTONES DE LA VENTA ACTUAL? Esta acción es permanente.')) {
        // Aquí iría la llamada al endpoint DELETE /todos-los-cartones
        alert("Funcionalidad de borrado en BD no implementada aún.");
    }
});
botonVerificarDuplicados.addEventListener('click', verificarDuplicados);
botonMostrarGanadores.addEventListener('click', () => {
    if(!ganadoresInfo||ganadoresInfo.length===0)return;
    const ganador = ganadoresInfo[indiceGanadorActual % ganadoresInfo.length];
    const cartonClonado=construirElementoCarton(ganador.id,ganador.matriz,ganador.isActive, 'vendido');
    const celdasClonadas=cartonClonado.querySelectorAll("td");celdasClonadas.forEach(celda=>{const numero=celda.textContent==="★"?"FREE":parseInt(celda.textContent,10);if(numerosCantados.includes(numero)||numero==="FREE"){celda.classList.add("marcado")}});
    modalCartonContainer.innerHTML="";
    modalCartonContainer.appendChild(cartonClonado);
    modalBackdrop.classList.remove("hidden");
    indiceGanadorActual++;
});
modalCloseButton.addEventListener('click', () => modalBackdrop.classList.add('hidden'));
modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) modalBackdrop.classList.add('hidden'); });
selectPatron.addEventListener('change', () => {
    imagenPatron.src = `imagenes/patron_${selectPatron.value}.png`;
    guardarEstadoDelJuegoLocal();
});
botonModo.addEventListener('click', () => {
    if(juegoTerminado)return;
    modoJuego=(modoJuego==='automatico')?'manual':'automatico';
    displayModo.textContent=`Modo: ${modoJuego.charAt(0).toUpperCase()+modoJuego.slice(1)}`;
    botonModo.textContent=`Cambiar a Modo ${modoJuego==='automatico'?'Manual':'Automático'}`;
    botonCantar.disabled=(modoJuego==='manual');
    contenedorNumerosMaestros.classList.toggle('modo-manual');
    guardarEstadoDelJuegoLocal();
});
contenedorNumerosMaestros.addEventListener('click', (event) => {
    if(modoJuego!=='manual'||juegoTerminado)return;
    if(event.target.classList.contains('celda-maestra')&&!event.target.classList.contains('cantado')){marcarNumero(parseInt(event.target.textContent,10));}
});
zonaDeCartones.addEventListener('change', (event) => {
    if (event.target.classList.contains('activar-carton-checkbox')) {
        const checkbox = event.target;
        const idCarton = parseInt(checkbox.id.split('-')[2]);
        const carton = cartonesEnJuego.find(c => c.id === idCarton);
        if (carton) {
            carton.isActive = checkbox.checked;
            carton.elemento.classList.toggle('carton-inactivo', !checkbox.checked);
            // Esto es solo visual. Se necesita backend para persistir.
            console.log(`Estado visual del cartón #${idCarton} cambiado a: ${carton.isActive}.`);
        }
    }
});

// --- INICIO DE LA APLICACIÓN ---
crearTablaMaestra();
cargarEstadoDelJuego();