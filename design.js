// -----------------------------------------------------------------------
// --- BACKEND CONNECTION ---
// -----------------------------------------------------------------------
// '' means "the same server that sent this page" (when you run the backend
// and open http://localhost:3000). If the API is hosted somewhere else,
// put its address here, e.g. 'https://frutica-api.onrender.com'.
const API_BASE = '';

// call the backend; returns the JSON reply or throws an Error with the server's message
async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!isJson) throw new Error('Backend not available');
  const data = await res.json();
  if (!res.ok) throw new Error((data.errors || [data.error]).join(' '));
  return data;
}

// products from the backend database; falls back to fruits.json if no backend is running
async function loadProducts() {
  try {
    return await apiFetch('/api/products');
  } catch (err) {
    const res = await fetch('fruits.json');
    return res.json();
  }
}

// Your existing carousel theme logic
const themes = [
    { accent: "#a99328", accent2: "#ffd966", img: "pear_logo.png" },
    { accent: "#e20132", accent2: "#ff7b7b", img: "watermelon_logo.png" },
    { accent: "#e27300", accent2: "#ff9a3c", img: "papaya_logo.png" }
];

let index = 0;
function hexToRGBA(hex, alpha=0.5){
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length==3){ c= [c[0],c[0],c[1],c[1],c[2],c[2]]; }
        c= '0x'+c.join('');
        return `rgba(${(c>>16)&255},${(c>>8)&255},${c&255},${alpha})`;
    }
    return hex;
}

function generateTiles(image){
    const mosaic = document.querySelector('.nav-mosaic');
    mosaic.innerHTML = '';
    const tileCount = 40;
    for(let i=0;i<tileCount;i++){
        const tile = document.createElement('div');
        tile.classList.add('tile');
        const w = Math.floor(Math.random()*100)+25;
        const h = Math.floor(Math.random()*50)+25;
        const r = Math.floor(Math.random()*360);
        const sx = Math.random()<0.5?-1:1;
        const sy = Math.random()<0.5?-1:1;
        tile.style.width = w+'px';
        tile.style.height = h+'px';
        tile.style.transform = `rotate(${r}deg) scale(${sx},${sy})`;
        tile.style.backgroundImage = `url('${image}')`;
        mosaic.appendChild(tile);
    }
}

function applyTheme(){
    const t = themes[index];
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--accent-2", t.accent2);
    document.documentElement.style.setProperty("--accent-shadow", hexToRGBA(t.accent,0.5));
    generateTiles(t.img);
    index = (index+1)%themes.length;
}
applyTheme();
setInterval(applyTheme, 10000);

const menuToggle = document.getElementById('menuToggle');
const navbar = document.getElementById('navbar');
if(menuToggle && navbar) {
    menuToggle.addEventListener('click', ()=>{ navbar.classList.toggle('active'); });
    // close the mobile menu after a link is tapped
    navbar.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=>{ navbar.classList.remove('active'); }));
}


// CAROUSEL LOGIC - Only run if elements exist (i.e., on index.html)
const wrapper = document.querySelector('.hero-wrapper');
if (wrapper) {
    const slides = document.querySelectorAll('.hero-wrapper .hero');
    const indicatorsContainer = document.querySelector('.carousel-indicators');
    let currentSlide = 0;
    let isDragging = false, startPos = 0, currentTranslate = 0, prevTranslate = 0, animationID;

    slides.forEach((_,i)=>{
        const dot = document.createElement('div');
        if(i===0) dot.classList.add('active');
        dot.addEventListener('click', ()=>{ goToSlide(i); });
        indicatorsContainer.appendChild(dot);
    });

    function setActiveIndicator(){
        document.querySelectorAll('.carousel-indicators div').forEach((dot,i)=>{
            dot.classList.toggle('active', i===currentSlide);
        });
    }

    function goToSlide(index){
        currentSlide = index;
        wrapper.style.transform = `translateX(-${currentSlide*100}%)`;
        setActiveIndicator();
    }

    function nextSlide(){ 
        currentSlide = (currentSlide+1)%slides.length;
        goToSlide(currentSlide);
    }

    // Auto slide
    let slideInterval = setInterval(nextSlide, 6000);

    // Drag/Swipe support
    wrapper.addEventListener('mousedown', dragStart);
    wrapper.addEventListener('touchstart', dragStart); 
    wrapper.addEventListener('mouseup', dragEnd);
    wrapper.addEventListener('mouseleave', dragEnd);
    wrapper.addEventListener('touchend', dragEnd);
    wrapper.addEventListener('mousemove', dragMove);
    wrapper.addEventListener('touchmove', dragMove);

    function dragStart(event){
        clearInterval(slideInterval);
        isDragging = true;
        startPos = getPositionX(event);
        wrapper.style.transition = 'none';
    }
    function dragMove(event){
        if(!isDragging) return;
        const currentPosition = getPositionX(event);
        currentTranslate = prevTranslate + currentPosition - startPos;
        wrapper.style.transform = `translateX(${currentTranslate}px)`;
    }
    function dragEnd(){
        if(!isDragging) return;
        isDragging = false;
        const movedBy = currentTranslate - prevTranslate;
        if(movedBy < -100) nextSlide();
        else if(movedBy > 100){ 
            currentSlide = (currentSlide-1 + slides.length)%slides.length;
            goToSlide(currentSlide);
        } else goToSlide(currentSlide);
        wrapper.style.transition = 'transform 0.5s ease-in-out';
        prevTranslate = -currentSlide*wrapper.offsetWidth;
        slideInterval = setInterval(nextSlide, 6000);
    }
    function getPositionX(event){
        return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    }
}


// -----------------------------------------------------
// --- INDEX.HTML INTERACTIVITY LOGIC (Unified Block) ---
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    // 'Show More' Button Logic
    const button = document.getElementById('learn-more-btn');
    const hiddenContainer = document.getElementById('more-cards');

    if (button && hiddenContainer) {
        // remember where the button normally lives (in the title block)
        const homeSpot = button.parentElement;
        const homeNext = button.nextSibling;
        const grid = hiddenContainer.closest('.main-grid-container');

        // row under the product grid that holds the button while expanded
        const bottomRow = document.createElement('div');
        bottomRow.className = 'show-less-row';
        grid.after(bottomRow);

        // Where should the button sit?
        // - below the products when they're expanded, OR when the heading takes the
        //   full width (cards are no longer beside it)
        // - otherwise under the heading
        function placeButton() {
            const expanded = !hiddenContainer.classList.contains('hidden-content');
            const headingFullWidth = homeSpot.offsetWidth >= grid.clientWidth - 5;
            if (expanded || headingFullWidth) {
                if (button.parentElement !== bottomRow) bottomRow.appendChild(button);
            } else if (button.parentElement !== homeSpot) {
                homeSpot.insertBefore(button, homeNext);
            }
        }

        button.addEventListener('click', function(e) {
            e.preventDefault();
            hiddenContainer.classList.toggle('hidden-content');
            const collapsed = hiddenContainer.classList.contains('hidden-content');
            button.textContent = collapsed ? 'LEARN MORE' : 'SHOW LESS';
            placeButton();
            if (collapsed) document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });

        window.addEventListener('resize', placeButton);
        placeButton();
    }

    // Card Hover Image Swap Logic
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const img = card.querySelector('img');
        if (!img) return; 

        card.addEventListener('mouseenter', () => {
            if (img.dataset.hover) {
                img.src = img.dataset.hover;
            }
        });

        card.addEventListener('mouseleave', () => {
            if (img.dataset.default) {
                img.src = img.dataset.default;
            }
        });
    });

    // --- PRODUCT PRICING LOGIC INITIALIZER (products.html specific) ---
    // Safely calls the pricing logic only if the necessary elements are on the page.
    if (typeof initProductPricing === 'function') initProductPricing();
});



// -------------------------------------
// --- DYNAMIC PRICING FUNCTIONS ---
// -------------------------------------
/* FILTER SEARCH + API with safe local fallback
   - Replace existing filter JS with this block (no design changes)
*/

const filterForm = document.getElementById('catalogueFilterForm');
const filterMessage = document.getElementById('filter-message');

let apiFruitCache = null;
let apiFailed = false;

// Local fallback nutritions (per 100g) — used if API unavailable
const localFallback = {
  apple:      { name: "Apple",      calories: 52,  sugar: 10.4, carbs: 13.8, protein: 0.3, fiber: 2.4 },
  banana:     { name: "Banana",     calories: 89,  sugar: 12.2, carbs: 22.8, protein: 1.1, fiber: 2.6 },
  orange:     { name: "Orange",     calories: 47,  sugar: 9.4,  carbs: 11.8, protein: 0.9, fiber: 2.4 },
  strawberry: { name: "Strawberry", calories: 32,  sugar: 4.9,  carbs: 7.7,  protein: 0.7, fiber: 2.0 },
  grape:      { name: "Grape",      calories: 69,  sugar: 15.5, carbs: 18.1, protein: 0.7, fiber: 0.9 },
  kiwi:       { name: "Kiwi",       calories: 61,  sugar: 9.0,  carbs: 14.7, protein: 1.1, fiber: 3.0 },
  mango:      { name: "Mango",      calories: 60,  sugar: 13.7, carbs: 15.0, protein: 0.8, fiber: 1.6 },
  pineapple:  { name: "Pineapple",  calories: 50,  sugar: 9.9,  carbs: 13.1, protein: 0.5, fiber: 1.4 },
  lemon:      { name: "Lemon",      calories: 29,  sugar: 2.5,  carbs: 9.3,  protein: 1.1, fiber: 2.8 },
  watermelon: { name: "Watermelon", calories: 30,  sugar: 6.2,  carbs: 7.6,  protein: 0.6, fiber: 0.4 },
  pear:       { name: "Pear",       calories: 57,  sugar: 9.8,  carbs: 15.2, protein: 0.4, fiber: 3.1 },
  cherry:     { name: "Cherry",     calories: 50,  sugar: 8.5,  carbs: 12.0, protein: 1.0, fiber: 1.6 },
  avocado:    { name: "Avocado",    calories: 160, sugar: 0.7,  carbs: 8.5,  protein: 2.0, fiber: 6.7 },
  blueberry:  { name: "Blueberry",  calories: 57,  sugar: 9.7,  carbs: 14.5, protein: 0.7, fiber: 2.4 },
  papaya:     { name: "Papaya",     calories: 43,  sugar: 7.8,  carbs: 10.8, protein: 0.5, fiber: 1.7 },
  melon:      { name: "Melon",      calories: 34,  sugar: 7.9,  carbs: 8.2,  protein: 0.8, fiber: 0.9 },
  raspberry:  { name: "Raspberry",  calories: 53,  sugar: 4.4,  carbs: 11.9, protein: 1.2, fiber: 6.5 },
  plum:       { name: "Plum",       calories: 46,  sugar: 9.9,  carbs: 11.4, protein: 0.7, fiber: 1.4 },
  apricot:    { name: "Apricot",    calories: 48,  sugar: 9.2,  carbs: 11.1, protein: 1.4, fiber: 2.0 }
};

// helper: normalize strings (remove non-alphanum, lowercase)
function normalizeKey(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// load API once and cache
async function loadFruitApi() {
  try {
    const res = await fetch("https://www.fruityvice.com/api/fruit/all");
    if (!res.ok) throw new Error("API returned " + res.status);
    const data = await res.json();
    // build lookup map keyed by normalized name
    apiFruitCache = {};
    data.forEach(f => {
      const key = normalizeKey(f.name);
      apiFruitCache[key] = {
        name: f.name,
        nutritions: {
          calories: f.nutritions?.calories ?? null,
          sugar: f.nutritions?.sugar ?? null,
          carbs: f.nutritions?.carbohydrates ?? null,
          protein: f.nutritions?.protein ?? null,
          fiber: f.nutritions?.fiber ?? null
        }
      };
    });
    apiFailed = false;
  } catch (err) {
    console.warn("FruityVice API load failed:", err);
    apiFailed = true;
    apiFruitCache = null;
  }
}

// initial load (start async, but fallback will work if it fails)
loadFruitApi();

// main search function: tries API first, then fallback
async function findFruitNormalized(rawName) {
  const key = normalizeKey(rawName);
  // try API cache (if loaded)
  if (apiFruitCache) {
    const match = apiFruitCache[key];
    if (match) return { source: "api", data: match };
  }
  // try local fallback
  if (localFallback[key]) {
    const f = localFallback[key];
    return { source: "local", data: { name: f.name, nutritions: { calories: f.calories, sugar: f.sugar, carbohydrates: f.carbs, protein: f.protein, fiber: f.fiber } } };
  }
  // no match
  return null;
}

// Submit handler
if (filterForm) filterForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const searchValue = (document.getElementById("fruitSearch") || {}).value || "";
  const trimmed = searchValue.trim();
  if (!trimmed) {
    filterMessage.textContent = "Please type a fruit name.";
    filterMessage.style.color = "";
    return;
  }

  // wait briefly for API to load if it hasn't yet (try to give it a moment)
  if (apiFruitCache === null && !apiFailed) {
    // give API up to 800ms to respond before using fallback
    try {
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, 800)),
        (async () => { while (apiFruitCache === null && !apiFailed) await new Promise(r => setTimeout(r, 50)); })()
      ]);
    } catch {}
  }

  const found = await findFruitNormalized(trimmed);

  if (!found) {
    filterMessage.textContent = "No products match your current filter selection.";
    filterMessage.style.color = "black";
    return;
  }

  const n = found.data.nutritions || {};
  // show results, keep markup simple so design untouched
  filterMessage.innerHTML = `
    <strong>${found.data.name}</strong> is available.<br><br>
    <u>Nutritional Facts (per 100g):</u><br>
    Calories: ${n.calories ?? "—"}<br>
    Sugar: ${n.sugar ?? "—"} g<br>
    Carbohydrates: ${n.carbohydrates ?? "—"} g<br>
    Protein: ${n.protein ?? "—"} g<br>
    Fiber: ${n.fiber ?? "—"} g
    ${found.source === "local" ? "<br><small>(Showing local fallback data)</small>" : ""}
  `;
  filterMessage.style.color = "--accent";
});



// -----------------------------------------------------------------------
//  GOOGLE MAPS API INTEGRATION FIX 
// -----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    const mapFrame = document.querySelector('.map-frame');
    if (!mapFrame || typeof L === 'undefined') return;

    // Opened as a local file: OpenStreetMap blocks map images for file:// pages,
    // so keep the embedded map (with its fixed label) that is already in the HTML.
    if (location.protocol === 'file:') return;

    // Online (e.g. GitHub Pages): swap in a Leaflet map so the popup follows the pin.
    const fruticaLat = 34.0522;
    const fruticaLng = -118.2437;
    const zoomLevel = 13;

    mapFrame.innerHTML = '<div id="map" class="contact-map"></div>';

    const map = L.map('map').setView([fruticaLat, fruticaLng], zoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([fruticaLat, fruticaLng])
        .addTo(map)
        .bindPopup("<b>Frutica Main Store</b><br>123 Fruit Street, Freshville, CA")
        .openPopup();
});
// -----------------------------------------------------------------------
// --- END GOOGLE MAPS API INTEGRATION ---
// -----------------------------------------------------------------------

// dynamic form behavior
const topic = document.getElementById("topic");
const dynamic = document.getElementById("dynamicFields");
const form = document.getElementById("contactForm") || document.querySelector(".contact-form");
let msg = document.getElementById("message");

// create a status line under the form if the page doesn't have one
if (form && !msg) {
  msg = document.createElement("p");
  msg.id = "message";
  form.insertBefore(msg, form.querySelector("button[type=submit]")); // keeps the button at the bottom
}

if (topic && dynamic) topic.addEventListener("change", () => {
  dynamic.innerHTML = "";

  if (topic.value === "order") {
    dynamic.innerHTML = `
      <label>Order Number</label>
      <input type="text" id="orderID" required>
    `;
  }

  if (topic.value === "wholesale") {
    dynamic.innerHTML = `
      <label>Company Name</label>
      <input type="text" id="company" required>

      <label>Quantity Needed</label>
      <input type="number" id="qty" required>
    `;
  }

  if (topic.value === "website") {
    dynamic.innerHTML = `
      <label>Page With Issue</label>
      <input type="text" id="page" placeholder="e.g., product_apple.html" required>
    `;
  }

  if (topic.value === "other") {
    dynamic.innerHTML = `
      <label>Describe Your Issue</label>
      <textarea id="desc" required></textarea>
    `;
  }
});

// form submission
if (form) form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const body = {
    name: form.elements.name?.value || "",
    email: form.elements.email?.value || "",
    message: form.elements.message?.value || ""
  };

  button.disabled = true;
  msg.style.color = "";
  msg.textContent = "Sending...";
  try {
    await apiFetch("/api/contact", { method: "POST", body: JSON.stringify(body) });
    msg.textContent = "Message sent! We’ll hit you back ASAP.";
    msg.style.color = "green";
    form.reset();
  } catch (err) {
    msg.textContent = err.message === "Backend not available"
      ? "Sorry, messages can't be sent right now. Please try again later."
      : err.message;
    msg.style.color = "#c0392b";
  } finally {
    button.disabled = false;
  }
});