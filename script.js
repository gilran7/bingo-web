// --- BARRERA DE SEGURIDAD ---
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
const botonBorrarCartones = document.getElementById('boton-borrar-cartones');
const botonVerificarDuplicados = document.getElementById('boton-verificar-duplicados');
const botonMostrarGanadores = document.getElementById('boton-mostrar-ganadores');
const botonModo = document.getElementById('boton-modo');
const botonGuardarCartones = document.getElementById('boton-guardar-cartones');

const numeroCantadoDisplay = document.getElementById('numero-cantado');
const listaHistorial = document.getElementById('lista-historial');
const contenedorNumerosMaestros = document.getElementById('contenedor-numeros-maestros');
const contenedorColumnasLetras = document.getElementById('contenedor-columnas-letras');
const zonaDeCartones = document.getElementById('zona-de-cartones');
const selectPatron = document.getElementById('select-patron');
const imagenPatron = document.getElementById('imagen-patron');
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

// --- FUNCIONES PRINCIPALES (Simplificado) ---
function generarMatrizDeCarton() {
    const numerosPorColumna = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };
    let matriz = Array.from({length:5},()=>Array(5));
    const columnas = Object.keys(numerosPorColumna);
    columnas.forEach((letra,i)=>{
        let min=numerosPorColumna[letra][0];
        let max=numerosPorColumna[letra][1];
        let usados=[];
        for(let j=0;j<5;j++){
            if(i===2 && j===2){ matriz[j][i]='FREE'; continue;}
            let num;
            do{ num=Math.floor(Math.random()*(max-min+1))+min; } while(usados.includes(num));
            usados.push(num);
            matriz[j][i]=num;
        }
    });
    return matriz;
}

function crearYAnadirCarton() {
    const matriz = generarMatrizDeCarton();
    const idCarton = cartonesEnJuego.length>0?Math.max(...cartonesEnJuego.map(c=>c.id))+1:1;
    const cartonDiv = construirElementoCarton(idCarton, matriz, true);
    zonaDeCartones.appendChild(cartonDiv);
    cartonesEnJuego.push({id:idCarton, matriz:matriz, elemento:cartonDiv, isActive:true});
}

// --- Construir cartón visual ---
function construirElementoCarton(id, matriz, isActive){
    const div=document.createElement('div');
    div.classList.add('carton-individual','card');
    div.id=`carton-${id}`;
    let html=`<h4>Cartón #${id}</h4><table><thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>`;
    for(let i=0;i<5;i++){html+='<tr>'; for(let j=0;j<5;j++){const val=matriz[i][j]; html+=`<td>${val==='FREE'?'★':val}</td>`;} html+='</tr>';}
    html+='</tbody></table>';
    div.innerHTML=html;
    return div;
}

// --- FUNCION GUARDAR CARTONES (fetch a Netlify) ---
async function guardarCartones() {
    try {
        const cards = cartonesEnJuego.map(c=>c.matriz);
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
    } catch (err) {
        alert(`❌ Hubo un error al conectar con el servidor: ${err}`);
    }
}

// --- EVENT LISTENERS ---
botonAnadirCarton.addEventListener('click', crearYAnadirCarton);
botonGuardarCartones.addEventListener('click', guardarCartones);
