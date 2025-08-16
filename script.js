// --- BARRERA DE SEGURIDAD (TEMPORALMENTE DESACTIVADA PARA PRUEBAS) ---
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
            alert(intentos > 0 ? `Contraseña incorrecta. Te quedan ${intentos} intentos.` : 'Has agotado tus intentos. Acceso denigado.');
        }
    }
}
if (!accesoPermitido) {
    document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px; font-family: sans-serif;">ACCESO DENEGADO</h1>';
    throw new Error("Acceso denegado por contraseña incorrecta.");
}
*/
// --- FIN DE LA BARRERA DE SEGURIDAD ---


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
// La variable 'reservas' ya no se usa, pero la dejamos por si acaso.
let reservas = new Map();

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

// --- ¡VERSIÓN MODIFICADA Y LIMPIA! ---
async function cargarEstadoDelJuego() {
    // Ya no cargamos nada desde un backend aquí. Solo desde el almacenamiento local.
    const estadoGuardado = localStorage.getItem('bingoGameState');
    if (estadoGuardado) {
        const estado = JSON.parse(estadoGuardado);
        cartonesEnJuego = [];
        zonaDeCartones.innerHTML = '';
        estado.cartones.forEach(datosCarton => {
            // Pasamos 'false' en el estado de vendido porque ya no lo manejamos aquí
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
            if (modoJuego === 'manual') {
                contenedorNumerosMaestros.classList.add('modo-manual');
            } else {
                contenedorNumerosMaestros.classList.remove('modo-manual');
            }
        }
    } else {
        // Si no hay estado guardado, simplemente creamos un cartón inicial.
        crearYAnadirCarton();
    }
}

// --- ¡VERSIÓN MODIFICADA Y LIMPIA! ---
async function iniciarNuevaRonda() {
    // Eliminamos toda la lógica que dependía del backend antiguo.
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

// --- ¡VERSIÓN MODIFICADA Y LIMPIA! ---
async function reiniciarSistemaCompleto() {
    // La lógica de esta función es ahora más simple.
    localStorage.removeItem('bingoGameState');
    cartonesEnJuego = [];
    zonaDeCartones.innerHTML = '';
    await iniciarNuevaRonda(); // Llama a la nueva ronda limpia
    crearYAnadirCarton();
}

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

// --- Funciones de Gestión de Cartones ---
function generarMatrizDeCarton() {
    const numerosPorColumna = { B: { min: 1, max: 15, numeros: [] }, I: { min: 16, max: 30, numeros: [] }, N: { min: 31, max: 45, numeros: [] }, G: { min: 46, max: 60, numeros: [] }, O: { min: 61, max: 75, numeros: [] } };
    let matriz = Array(5).fill(null).map(() => Array(5));
    for (let i = 0; i < 5; i++) { const letra = Object.keys(numerosPorColumna)[i]; for (let j = 0; j < 5; j++) { if (i === 2 && j === 2) { matriz[j][i] = 'FREE'; } else { let numero; const columna = numerosPorColumna[letra]; do { numero = Math.floor(Math.random() * (columna.max - columna.min + 1)) + columna.min; } while (columna.numeros.includes(numero)); columna.numeros.push(numero); matriz[j][i] = numero; } } }
    return matriz;
}

function crearYAnadirCarton() {
    const matriz = generarMatrizDeCarton();
    const idCarton = cartonesEnJuego.length > 0 ? Math.max(...cartonesEnJuego.map(c => c.id)) + 1 : 1;
    reconstruirCartonDesdeDatos(idCarton, matriz, true);
    guardarEstadoDelJuego();
}

function reconstruirCartonDesdeDatos(idCarton, matriz, isActive = true) {
    const cartonDiv = construirElementoCarton(idCarton, matriz, isActive);
    zonaDeCartones.appendChild(cartonDiv);
    cartonesEnJuego.push({ id: idCarton, matriz: matriz, elemento: cartonDiv, isActive: isActive });
}

function construirElementoCarton(idCarton, matriz, isActive) {
    const cartonDiv = document.createElement('div');
    cartonDiv.classList.add('carton-individual');
    if (!isActive) cartonDiv.classList.add('carton-inactivo');
    cartonDiv.id = `carton-${idCarton}`;

    // El botón de 'Vendido' ya no tiene lógica aquí, pero lo dejamos visualmente.
    const textoBotonVendido = 'Marcar Vendido'; 

    let cartonHTML = `
        <h4>Cartón #${idCarton}</h4>
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
                <label for="activar-carton-${idCarton}">Juega:</label>
                <input type="checkbox" id="activar-carton-${idCarton}" class="activar-carton-checkbox" ${isActive ? 'checked' : ''}>
            </div>
            <button class="marcar-vendido-btn" data-id="${idCarton}">${textoBotonVendido}</button>
        </div>`;
    cartonDiv.innerHTML = cartonHTML;
    return cartonDiv;
}

// --- Lógica de Juego y Event Listeners ---
function marcarNumero(numero){if(numerosCantados.includes(numero)||juegoTerminado)return;numerosCantados.push(numero);actualizarTodosDisplays();guardarEstadoDelJuego();verificarGanadores()}
function cantarNumeroAutomatico(){if(numerosCantados.length>=75)return;let nuevoNumero;do{nuevoNumero=Math.floor(Math.random()*75)+1}while(numerosCantados.includes(nuevoNumero));marcarNumero(nuevoNumero)}
function retrocederNumero(){if(numerosCantados.length===0||juegoTerminado)return;numerosCantados.pop();actualizarTodosDisplays();guardarEstadoDelJuego()}
function actualizarTodosDisplays(){document.querySelectorAll(".celda-maestra.cantado").forEach(c=>c.classList.remove("cantado"));document.querySelectorAll(".carton-individual td.marcado").forEach(c=>{if(c.textContent!=="★")c.classList.remove("marcado")});listaHistorial.innerHTML="";numerosCantados.forEach(num=>{document.getElementById(`maestra-${num}`)?.classList.add("cantado");cartonesEnJuego.forEach(carton=>{for(let i=0;i<5;i++)for(let j=0;j<5;j++)if(carton.matriz[i][j]===num)carton.elemento.querySelector("tbody").rows[i].cells[j].classList.add("marcado")})});const ultimos5=numerosCantados.slice(-5).reverse();ultimos5.forEach(num=>{const itemHistorial=document.createElement("div");itemHistorial.className="numero-historial";itemHistorial.textContent=num;listaHistorial.appendChild(itemHistorial)});const ultimoNumero=numerosCantados.length>0?numerosCantados[numerosCantados.length-1]:"--";numeroCantadoDisplay.textContent=ultimoNumero;botonRetroceder.disabled=numerosCantados.length===0||juegoTerminado}
function verificarGanadores(){if(juegoTerminado)return;const patron=selectPatron.value;ganadoresInfo=[];const cartonesActivos=cartonesEnJuego.filter(carton=>carton.isActive);cartonesActivos.forEach(carton=>{const celdas=Array.from(carton.elemento.querySelector("tbody").rows).map(row=>Array.from(row.cells));let esGanador=false;const isMarked=(r,c)=>celdas[r][c].classList.contains("marcado");switch(patron){case"fila":for(let i=0;i<5;i++){if(celdas[i].every(c=>c.classList.contains("marcado")))esGanador=true}break;case"columna":for(let i=0;i<5;i++){if(celdas.every(f=>f[i].classList.contains("marcado")))esGanador=true}break;case"lnormal":esGanador=celdas.every(row=>row[0].classList.contains("marcado"))&&celdas[4].every(c=>c.classList.contains("marcado"));break;case"linvertida":esGanador=celdas.every(row=>row[4].classList.contains("marcado"))&&celdas[0].every(c=>c.classList.contains("marcado"));break;case"e":esGanador=celdas.every(row=>row[0].classList.contains("marcado"))&&celdas[0].every(c=>c.classList.contains("marcado"))&&celdas[2].every(c=>c.classList.contains("marcado"))&&celdas[4].every(c=>c.classList.contains("marcado"));break;case"x":esGanador=celdas.every((row,i)=>row[i].classList.contains("marcado"))&&celdas.every((row,i)=>row[4-i].classList.contains("marcado"));break;case"4esquinas":esGanador=isMarked(0,0)&&isMarked(0,4)&&isMarked(4,0)&&isMarked(4,4);break;case"cruzpequeña":esGanador=isMarked(1,2)&&isMarked(2,1)&&isMarked(2,2)&&isMarked(2,3)&&isMarked(3,2);break;case"cruzgrande":esGanador=celdas[2].every(c=>c.classList.contains("marcado"))&&celdas.every(f=>f[2].classList.contains("marcado"));break;case"t":esGanador=celdas[0].every(c=>c.classList.contains("marcado"))&&celdas.every(row=>row[2].classList.contains("marcado"));break;case"bordecarton":esGanador=celdas[0].every(c=>c.classList.contains("marcado"))&&celdas[4].every(c=>c.classList.contains("marcado"))&&celdas.every(row=>row[0].classList.contains("marcado"))&&celdas.every(row=>row[4].classList.contains("marcado"));break;case"cartonlleno":esGanador=celdas.flat().every(c=>c.classList.contains("marcado"));break}if(esGanador)ganadoresInfo.push(carton)});if(ganadoresInfo.length>0){indiceGanadorActual=0;deshabilitarControlesFinDeJuego();const idsGanadores=ganadoresInfo.map(c=>c.id);idsGanadores.forEach(id=>{document.getElementById(`carton-${id}`).classList.add("carton-ganador")});botonMostrarGanadores.disabled=false;setTimeout(()=>{alert(`¡¡¡ B I N G O !!!\n\nGanador(es): Cartón #${idsGanadores.join(", #")}\nPatrón: ${patron.toUpperCase()}`)},200);guardarEstadoDelJuego()}}
function deshabilitarControlesFinDeJuego(){juegoTerminado=true;botonCantar.disabled=true;botonAnadirCarton.disabled=true;botonModo.disabled=true;botonRetroceder.disabled=true;contenedorNumerosMaestros.classList.remove("modo-manual")}
function verificarDuplicados(){const duplicados=[];const matricesString=cartonesEnJuego.map(carton=>JSON.stringify(carton.matriz.flat().filter(n=>n!=="FREE").sort((a,b)=>a-b)));for(let i=0;i<matricesString.length;i++){for(let j=i+1;j<matricesString.length;j++){if(matricesString[i]===matricesString[j]){duplicados.push(`- Cartón #${i+1} y Cartón #${j+1}`)}}}if(duplicados.length>0){alert(`¡Se encontraron cartones repetidos!\n\n${[...new Set(duplicados)].join("\n")}`)}else{alert("Verificación completada. No se encontraron cartones repetidos.")}}

botonCantar.addEventListener('click', cantarNumeroAutomatico);
botonAnadirCarton.addEventListener('click', crearYAnadirCarton);
botonNuevaRonda.addEventListener('click', iniciarNuevaRonda);
botonRetroceder.addEventListener('click', retrocederNumero);
botonBorrarCartones.addEventListener('click', () => { if (confirm('¿Estás seguro de que quieres borrar todos los cartones?')) { reiniciarSistemaCompleto(); } });
botonVerificarDuplicados.addEventListener('click', verificarDuplicados);
botonMostrarGanadores.addEventListener('click', () => {
    if (!ganadoresInfo || ganadoresInfo.length === 0) return;
    if (indiceGanadorActual >= ganadoresInfo.length) {
        alert('Se han mostrado todos los cartones ganadores. El ciclo comenzará de nuevo.');
        indiceGanadorActual = 0;
    }
    const ganador = ganadoresInfo[indiceGanadorActual];
    const cartonClonado = construirElementoCarton(ganador.id, ganador.matriz, ganador.isActive);
    const celdasClonadas = cartonClonado.querySelectorAll("td");
    celdasClonadas.forEach(celda => {
        const numero = celda.textContent === "★" ? "FREE" : parseInt(celda.textContent, 10);
        if (numerosCantados.includes(numero) || numero === "FREE") {
            celda.classList.add("marcado");
        }
    });
    modalCartonContainer.innerHTML = "";
    modalCartonContainer.appendChild(cartonClonado);
    modalBackdrop.classList.remove("hidden");
    indiceGanadorActual++;
});
modalCloseButton.addEventListener('click', () => modalBackdrop.classList.add('hidden'));
modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) { modalBackdrop.classList.add('hidden'); } });
selectPatron.addEventListener('change', () => {
    const patronSeleccionado = selectPatron.value;
    imagenPatron.src = `imagenes/patron_${patronSeleccionado}.png`;
    imagenPatron.onerror = () => { imagenPatron.src = 'imagenes/patron_cartonvacio.png'; };
    guardarEstadoDelJuego();
});
botonModo.addEventListener('click', () => {
    if (juegoTerminado) return;
    modoJuego = (modoJuego === 'automatico') ? 'manual' : 'automatico';
    displayModo.textContent = `Modo: ${modoJuego.charAt(0).toUpperCase() + modoJuego.slice(1)}`;
    botonModo.textContent = `Cambiar a Modo ${modoJuego === 'automatico' ? 'Manual' : 'Automático'}`;
    botonCantar.disabled = (modoJuego === 'manual');
    contenedorNumerosMaestros.classList.toggle('modo-manual');
    guardarEstadoDelJuego();
});
contenedorNumerosMaestros.addEventListener('click', (event) => {
    if (modoJuego !== 'manual' || juegoTerminado) return;
    if (event.target.classList.contains('celda-maestra') && !event.target.classList.contains('cantado')) {
        marcarNumero(parseInt(event.target.textContent, 10));
    }
});

// --- ¡VERSIÓN MODIFICADA Y LIMPIA! ---
zonaDeCartones.addEventListener('click', async (event) => {
    // La lógica del botón 'marcar-vendido-btn' ha sido eliminada
    // porque ahora se gestionará de otra forma.
    // Dejamos este listener por si añadimos otra funcionalidad en el futuro.
});

zonaDeCartones.addEventListener('change', (event) => {
    if (event.target.classList.contains('activar-carton-checkbox')) {
        const checkbox = event.target;
        const idCarton = parseInt(checkbox.id.split('-')[2]);
        const carton = cartonesEnJuego.find(c => c.id === idCarton);
        if (carton) {
            carton.isActive = checkbox.checked;
            carton.elemento.classList.toggle('carton-inactivo', !checkbox.checked);
            guardarEstadoDelJuego();
            // ¡Aquí es donde llamaremos a nuestro nuevo backend en el futuro!
        }
    }
});

// --- Inicio de la Aplicación ---
crearTablaMaestra();
cargarEstadoDelJuego();