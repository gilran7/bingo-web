document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('cartones-disponibles-container');
    const listaCarrito = document.getElementById('lista-carrito');
    const totalPagarDisplay = document.getElementById('total-pagar');
    const cartonesSeleccionadosInput = document.getElementById('cartones-seleccionados-input');
    const PRECIO_POR_CARTON = 2.00;
    
    let carritoLocal = JSON.parse(localStorage.getItem('bingoCarritoLocal')) || [];

    async function inicializarTienda() {
        container.innerHTML = '<p>Cargando cartones disponibles...</p>';
        
        try {
            const estadoGuardado = localStorage.getItem('bingoGameState');
            if (!estadoGuardado) throw new Error('No hay cartones configurados. Ve al panel de admin para crearlos.');
            
            const todosLosCartones = JSON.parse(estadoGuardado).cartones;
            const cartonesActivos = todosLosCartones.filter(c => c.isActive);

            if(cartonesActivos.length === 0) {
                container.innerHTML = '<p class="mensaje-feedback">No hay cartones activos para la venta.</p>';
                return;
            }

            const reservas = await obtenerReservas(); // Esta es ahora la única fuente de verdad
            
            // Filtramos los cartones que NO están en la lista de reservas
            const cartonesALaVenta = cartonesActivos.filter(carton => !reservas.has(carton.id));

            if(cartonesALaVenta.length === 0) {
                container.innerHTML = '<p class="mensaje-feedback">¡Todos los cartones activos han sido vendidos!</p>';
                return;
            }

            dibujarCartones(cartonesALaVenta, new Set()); // Pasamos un set vacío porque ya hemos filtrado

        } catch (error) {
            console.error("Error al inicializar tienda:", error);
            container.innerHTML = `<p class="mensaje-error">${error.message}</p>`;
        }
    }

    async function obtenerReservas() {
        const response = await fetch('/.netlify/functions/get-reservations');
        if (!response.ok) { throw new Error('El servicio de reservas no respondió.'); }
        
        const submissions = await response.json();
        const reservados = new Set();
        submissions.forEach(sub => {
            if (sub.data && sub.data.cartonId) {
                reservados.add(parseInt(sub.data.cartonId, 10));
            }
        });
        return reservados;
    }
    
    // El resto del archivo se queda igual...
    async function enviarReserva(idCarton){const formData=new FormData;formData.append("form-name","reservas-bingo");formData.append("cartonId",idCarton);formData.append("timestamp",Date.now().toString());await fetch("/",{method:"POST",body:new URLSearchParams(formData)})}function dibujarCartones(cartonesDelJuego,cartonesReservados){container.innerHTML="";cartonesDelJuego.forEach(carton=>{const id=carton.id;const estaEnMiCarrito=carritoLocal.includes(id);const cartonDiv=document.createElement("div");cartonDiv.classList.add("carton-individual","carton-venta");cartonDiv.dataset.id=id;if(estaEnMiCarrito){cartonDiv.classList.add("reservado")}let tablaHTML=`<h4>Cartón #${id}</h4>`;if(estaEnMiCarrito){tablaHTML+=`<div class="estado-label">EN TU CARRITO</div>`}let tabla="<table><thead><tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr></thead><tbody>";for(let fila=0;fila<5;fila++){tabla+="<tr>";for(let col=0;col<5;col++){tabla+=`<td>${carton.matriz[fila][col]==="FREE"?"★":carton.matriz[fila][col]}</td>`}tabla+="</tr>"}tabla+="</tbody></table>";tablaHTML+=tabla;cartonDiv.innerHTML=tablaHTML;container.appendChild(cartonDiv)});actualizarCarrito()}function actualizarCarrito(){localStorage.setItem("bingoCarritoLocal",JSON.stringify(carritoLocal));listaCarrito.innerHTML="";if(carritoLocal.length===0){listaCarrito.innerHTML="<li>No has seleccionado ningún cartón.</li>"}else{carritoLocal.sort((a,b)=>a-b).forEach(id=>{const li=document.createElement("li");li.textContent=`Cartón #${id}`;const botonQuitar=document.createElement("button");botonQuitar.textContent="Quitar";botonQuitar.classList.add("quitar-del-carrito");botonQuitar.dataset.id=id;li.appendChild(botonQuitar);listaCarrito.appendChild(li)})}totalPagarDisplay.textContent=`${(carritoLocal.length*PRECIO_POR_CARTON).toFixed(2)}`;cartonesSeleccionadosInput.value=carritoLocal.join(", ")}container.addEventListener("click",async event=>{const cartonDiv=event.target.closest(".carton-venta");if(!cartonDiv||cartonDiv.classList.contains("reservado"))return;const cartonId=parseInt(cartonDiv.dataset.id);try{await enviarReserva(cartonId);carritoLocal.push(cartonId);cartonDiv.classList.add("reservado");const h4=cartonDiv.querySelector("h4");if(h4)h4.insertAdjacentHTML("afterend",'<div class="estado-label">EN TU CARRITO</div>');actualizarCarrito()}catch(error){console.error("Fallo al reservar el cartón:",error);alert("No se pudo reservar el cartón. Inténtalo de nuevo.")}});listaCarrito.addEventListener("click",event=>{if(!event.target.classList.contains("quitar-del-carrito"))return;const cartonId=parseInt(event.target.dataset.id);carritoLocal=carritoLocal.filter(id=>id!==cartonId);const cartonDiv=container.querySelector(`.carton-venta[data-id="${cartonId}"]`);if(cartonDiv){cartonDiv.classList.remove("reservado");const label=cartonDiv.querySelector(".estado-label");if(label)label.remove()}actualizarCarrito()});inicializarTienda();
});