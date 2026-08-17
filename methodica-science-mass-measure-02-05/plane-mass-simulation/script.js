/* Simulation logic for the plane mass simulation */

const state = {
  passengers: false,
  luggage: false,
  fuel: false
};

const WEIGHTS = {
  base: 41,
  passengers: 12,
  luggage: 6,
  fuel: 20
};

const PLANE_IMAGES = {
  '000': 'assets/images/plane-empty.png',
  '100': 'assets/images/airplane- with travelers.png',
  '010': 'assets/images/airplane-_with_luggage.png',
  '001': 'assets/images/airplane- with-fluid.png',
  '110': 'assets/images/airplane- with travelers and luggage.png',
  '101': 'assets/images/airplane- with-fluid-and-travelers.png',
  '011': 'assets/images/airplane-with-luggage-and-fluid.png',
  '111': 'assets/images/airplane- with travelers and luggage and fluid.png'
};

/* ── State calculations ─────────────────────────────────── */

function calculateWeight() {
  let total = WEIGHTS.base;
  if (state.passengers) total += WEIGHTS.passengers;
  if (state.luggage)    total += WEIGHTS.luggage;
  if (state.fuel)       total += WEIGHTS.fuel;
  return total;
}

function updateWeightDisplay() {
  const el = document.getElementById('weight-value');
  if (el) el.textContent = calculateWeight() + ' טון';
}

function updatePlaneImage() {
  const key = (state.passengers ? '1' : '0')
            + (state.luggage    ? '1' : '0')
            + (state.fuel       ? '1' : '0');
  const img = document.querySelector('.plane-image');
  if (img) img.src = PLANE_IMAGES[key];
}

function toggleItem(itemName) {
  if (!(itemName in state)) return;
  state[itemName] = !state[itemName];
  updateWeightDisplay();
  updatePlaneImage();
  updateActiveIcons();
  updateCardLoadedState();
}

function resetSimulation() {
  state.passengers = false;
  state.luggage    = false;
  state.fuel       = false;
  updateWeightDisplay();
  updatePlaneImage();
  /* clear any lingering drag styles from all cards */
  document.querySelectorAll('.card[data-item]').forEach(card => {
    card.style.transition = '';
    card.style.transform  = '';
    card.style.zIndex     = '';
    card.style.position   = '';
    card.classList.remove('is-loaded');
  });
  /* hide any active-item icons and clear any lingering fly-back styles */
  document.querySelectorAll('.active-icon[data-item]').forEach(icon => {
    icon.hidden = true;
    icon.style.transition = '';
    icon.style.transform  = '';
    icon.style.opacity    = '';
  });
}

/* ── Active-item icons ──────────────────────────────────── */
/* Shows the icon for any item that just became loaded. Hiding an icon is
   the caller's responsibility (immediately, for the re-drag-to-remove
   path; after the fly-back animation, for the click-to-remove path) so
   this never fights either removal path's own timing. */
function updateActiveIcons() {
  Object.keys(state).forEach(function (item) {
    if (!state[item]) return;
    const iconEl = document.querySelector('.active-icon[data-item="' + item + '"]');
    if (iconEl) iconEl.hidden = false;
  });
}

/* Once an item is loaded onto the plane, its warehouse card dims out and
   stops accepting drags — otherwise the item visually exists in both the
   cards area and the plane at the same time, which reads as a bug. */
function updateCardLoadedState() {
  Object.keys(state).forEach(function (item) {
    const card = document.querySelector('.card[data-item="' + item + '"]');
    if (card) card.classList.toggle('is-loaded', state[item]);
  });
}

function flyIconToCard(itemName, iconEl) {
  const card = document.querySelector('.card[data-item="' + itemName + '"]');
  if (!card) { iconEl.hidden = true; return; }
  const iconRect = iconEl.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const dx = (cardRect.left + cardRect.width / 2 - (iconRect.left + iconRect.width / 2)) / currentScale;
  const dy = (cardRect.top + cardRect.height / 2 - (iconRect.top + iconRect.height / 2)) / currentScale;
  iconEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
  iconEl.style.transform  = `translate(${dx}px, ${dy}px) scale(0.5)`;
  iconEl.style.opacity    = '0';
  iconEl.addEventListener('transitionend', function handler() {
    iconEl.removeEventListener('transitionend', handler);
    iconEl.hidden = true;
    iconEl.style.transition = '';
    iconEl.style.transform  = '';
    iconEl.style.opacity    = '';
  }, { once: true });
}

function onActiveIconClick(itemName) {
  const iconEl = document.querySelector('.active-icon[data-item="' + itemName + '"]');
  if (!iconEl || iconEl.hidden) return;
  toggleItem(itemName);
  flyIconToCard(itemName, iconEl);
}

/* ── Drag helpers ───────────────────────────────────────── */

function isDroppedOnPlane(clientX, clientY) {
  const planeEl = document.querySelector('.plane-image');
  if (!planeEl) return false;
  const rect = planeEl.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right
      && clientY >= rect.top  && clientY <= rect.bottom;
}

function returnCardToSlot(card) {
  card.style.transition = 'transform 0.25s ease';
  card.style.transform  = 'translate(0, 0)';
  card.style.zIndex     = '';
  card.addEventListener('transitionend', () => {
    card.style.transition = '';
    card.style.transform  = '';
    card.style.position   = '';
  }, { once: true });
}

function makeCardDraggable(card) {
  let originX = 0, originY = 0;

  function onPointerDown(e) {
    e.preventDefault();
    card.setPointerCapture(e.pointerId);
    originX = e.clientX;
    originY = e.clientY;
    card.style.transition = 'none';
    card.style.zIndex     = '1000';
    card.style.position   = 'relative';
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup',   onPointerUp);
  }

  function onPointerMove(e) {
    /* Divide by the canvas scale: the translate below happens inside the
       scaled .simulation, so raw screen-pixel deltas would otherwise move
       the card slower/faster than the pointer once scaleApp() is active. */
    const dx = (e.clientX - originX) / currentScale;
    const dy = (e.clientY - originY) / currentScale;
    card.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function onPointerUp(e) {
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerup',   onPointerUp);

    if (isDroppedOnPlane(e.clientX, e.clientY)) {
      const itemName = card.dataset.item;
      toggleItem(itemName);
      if (!state[itemName]) {
        /* removed via re-drag rather than clicking its icon — the card
           already animates back to its slot below, so just hide the
           icon immediately instead of flying it back too */
        const iconEl = document.querySelector('.active-icon[data-item="' + itemName + '"]');
        if (iconEl) iconEl.hidden = true;
      }
    }

    returnCardToSlot(card);
  }

  card.addEventListener('pointerdown', onPointerDown);
}

/* ── Prevent text/image selection during drag ───────────── */
document.addEventListener('selectstart', e => {
  if (e.target.closest('.card')) e.preventDefault();
});

/* ── Scale-to-fit (for standalone view and iframe embedding) ─
   .simulation is a fixed-size design canvas; this scales and centers it
   to whatever window/iframe it's placed in, with zero scrollbars,
   the same pattern the 720 engine uses for its own canvas. */

const DESIGN_WIDTH = 650;
/* .simulation's only child is .plane-scene (aspect-ratio 963/1433, width:100%)
   — the cropped background image's real proportions — so the design
   canvas's true height is always DESIGN_WIDTH * 1433/963. Must stay in
   sync with .plane-scene's aspect-ratio in style.css; a stale mismatch
   here previously undersized the whole simulation and left empty space
   below it (see git history / prior comment if this happens again). */
const DESIGN_HEIGHT = DESIGN_WIDTH * (1433 / 963);
let currentScale = 1;

function scaleApp() {
  const sim = document.querySelector('.simulation');
  if (!sim) return;
  currentScale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  const left = (window.innerWidth - DESIGN_WIDTH * currentScale) / 2;
  const top = (window.innerHeight - DESIGN_HEIGHT * currentScale) / 2;
  sim.style.transform = `scale(${currentScale})`;
  sim.style.left = `${left}px`;
  sim.style.top = `${top}px`;
}

window.addEventListener('resize', scaleApp);
scaleApp();

/* ── Init ───────────────────────────────────────────────── */

document.querySelectorAll('.card[data-item]').forEach(makeCardDraggable);

document.getElementById('reset-btn')
  .addEventListener('click', resetSimulation);
