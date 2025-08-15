<script>
const API = path => `/.netlify/functions/${path}`;

async function fetchAvailable() {
  const res = await fetch(API('get-available-cards'));
  const data = await res.json();
  return data.cards || [];
}

function renderCards(container, cards) {
  container.innerHTML = '';
  for (const c of cards) {
    const btn = document.createElement('button');
    btn.textContent = `Cartón ${c.id}`;
    btn.onclick = () => reserve(c.id);
    btn.className = 'card-btn';
    container.appendChild(btn);
  }
}

let activeTimer = null;

function startCountdown(msUntil, onExpire) {
  const el = document.getElementById('status');
  if (activeTimer) clearInterval(activeTimer);
  function tick() {
    const left = msUntil - Date.now();
    if (left <= 0) {
      el.textContent = 'Reserva expirada';
      clearInterval(activeTimer);
      onExpire();
      return;
    }
    const h = Math.floor(left / (1000*60*60));
    const m = Math.floor((left % (1000*60*60)) / (1000*60));
    const s = Math.floor((left % (1000*60)) / 1000);
    el.textContent = `Reservado. Tiempo restante: ${h}h ${m}m ${s}s`;
  }
  tick();
  activeTimer = setInterval(tick, 1000);
}

async function reserve(id) {
  const res = await fetch(API('reserve-card'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'No se pudo reservar');
    await load();
    return;
  }
  // Arranca countdown y muestra botón de comprar y liberar
  startCountdown(data.reservedUntil, async () => {
    await fetch(API('release-card'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id })
    });
    await load();
  });

  const actions = document.getElementById('actions');
  actions.innerHTML = '';
  const buy = document.createElement('button');
  buy.textContent = 'Confirmar compra';
  buy.onclick = () => confirmPurchase(id);
  const release = document.createElement('button');
  release.textContent = 'Cancelar / Liberar';
  release.onclick = () => releaseCard(id);
  actions.appendChild(buy);
  actions.appendChild(release);
}

async function releaseCard(id) {
  await fetch(API('release-card'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id })
  });
  document.getElementById('status').textContent = 'Reserva liberada';
  if (activeTimer) clearInterval(activeTimer);
  await load();
}

async function confirmPurchase(id) {
  const res = await fetch(API('confirm-purchase'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'No se pudo comprar');
    return;
  }
  if (activeTimer) clearInterval(activeTimer);
  document.getElementById('status').textContent = '¡Compra confirmada!';
  document.getElementById('actions').innerHTML = '';
  await load();
}

async function load() {
  const container = document.getElementById('cards');
  const cards = await fetchAvailable();
  renderCards(container, cards);
}

document.addEventListener('DOMContentLoaded', load);
</script>
