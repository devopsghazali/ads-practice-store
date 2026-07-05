/* =========================================================
   NovaGear – Ads Practice Store
   Shared logic: product catalog, cart (localStorage), UTM
   attribution, consent, wishlist, and dataLayer events for
   Google Tag Manager / Facebook Pixel / Google Ads practice.
   ========================================================= */

window.dataLayer = window.dataLayer || [];

// ---- Product catalog (dummy data) ----
const PRODUCTS = [
  { id: "1", name: "Wireless Earbuds Pro", price: 2999, category: "Audio", emoji: "🎧", color: "#6C5CE7",
    desc: "Noise-cancelling wireless earbuds with 24h battery life." },
  { id: "2", name: "Smart Fitness Band", price: 1499, category: "Wearables", emoji: "⌚", color: "#00B894",
    desc: "Track steps, heart rate and sleep with a 10-day battery." },
  { id: "3", name: "Bluetooth Speaker", price: 1999, category: "Audio", emoji: "🔊", color: "#0984E3",
    desc: "Portable speaker with deep bass and IPX7 waterproofing." },
  { id: "4", name: "Phone Camera Lens Kit", price: 999, category: "Photography", emoji: "📷", color: "#E17055",
    desc: "Clip-on wide, macro and fisheye lens set for smartphones." },
  { id: "5", name: "Mechanical Keyboard", price: 3499, category: "Accessories", emoji: "⌨️", color: "#2D3436",
    desc: "RGB backlit mechanical keyboard with hot-swappable switches." },
  { id: "6", name: "Wireless Mouse", price: 799, category: "Accessories", emoji: "🖱️", color: "#D63031",
    desc: "Ergonomic wireless mouse with silent clicks." },
];

function getProduct(id) {
  return PRODUCTS.find(p => p.id === String(id));
}

function formatPrice(n) {
  return "Rs. " + n.toLocaleString();
}

// ---- Event log (for events-log.html — visualize dataLayer without devtools) ----
function logEventToPanel(data) {
  try {
    const log = JSON.parse(sessionStorage.getItem("novagear_event_log") || "[]");
    log.push({
      time: new Date().toLocaleTimeString(),
      page: (window.location.pathname.split("/").pop() || "index.html"),
      data: data
    });
    if (log.length > 150) log.shift();
    sessionStorage.setItem("novagear_event_log", JSON.stringify(log));
  } catch (e) { /* storage full or blocked — ignore */ }
}

// Wrap dataLayer.push so every push (ours + GTM's own gtm.dom/gtm.load) is logged
(function () {
  const originalPush = Array.prototype.push.bind(window.dataLayer);
  window.dataLayer.push = function (data) {
    logEventToPanel(data);
    return originalPush(data);
  };
})();

// ---- dataLayer helper ----
function pushDL(event, payload) {
  const data = Object.assign({ event }, payload || {});
  window.dataLayer.push(data);
  console.log("[dataLayer push]", data);
}

// ---- UTM / ad-click attribution capture ----
function captureUTMs() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"];
  const found = {};
  keys.forEach(k => { if (params.get(k)) found[k] = params.get(k); });

  if (Object.keys(found).length > 0) {
    found.landing_page = window.location.pathname;
    found.captured_at = new Date().toISOString();
    sessionStorage.setItem("novagear_attribution", JSON.stringify(found));
    pushDL("ad_click_detected", { attribution: found });
  }
}
captureUTMs(); // run immediately, before DOMContentLoaded

function getAttribution() {
  try {
    return JSON.parse(sessionStorage.getItem("novagear_attribution") || "{}");
  } catch (e) {
    return {};
  }
}

// ---- Consent Mode (Accept / Reject banner) ----
function getConsent() {
  return localStorage.getItem("novagear_consent"); // 'granted' | 'denied' | null
}

function setConsent(status) {
  localStorage.setItem("novagear_consent", status);
  pushDL("consent_update", { consent_status: status });
  const banner = document.getElementById("consent-banner");
  if (banner) banner.remove();
}

function injectConsentBanner() {
  if (getConsent() || document.getElementById("consent-banner")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div id="consent-banner" class="consent-banner">
      <p>We use cookies to measure ad performance (practice site — no real data is collected).</p>
      <div class="consent-actions">
        <button class="btn btn-outline btn-small-inline" onclick="setConsent('denied')">Reject</button>
        <button class="btn btn-small-inline" onclick="setConsent('granted')">Accept</button>
      </div>
    </div>
  `);
}

// ---- Floating WhatsApp / Call buttons ----
function injectFloatingButtons() {
  if (document.querySelector(".floating-actions")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="floating-actions">
      <a href="https://wa.me/10000000000?text=Hi%20NovaGear!" target="_blank" rel="noopener"
         class="fab fab-whatsapp" onclick="pushDL('contact_click', {method:'whatsapp'})" title="Chat on WhatsApp">💬</a>
      <a href="tel:+10000000000" class="fab fab-call"
         onclick="pushDL('contact_click', {method:'call'})" title="Call us">📞</a>
    </div>
  `);
}

// ---- Newsletter signup (injected into every page footer) ----
function injectNewsletter() {
  const footer = document.querySelector("footer");
  if (!footer || document.getElementById("newsletter-form")) return;
  footer.insertAdjacentHTML("afterbegin", `
    <form id="newsletter-form" class="newsletter" onsubmit="submitNewsletter(event)">
      <input type="email" name="email" placeholder="Get exclusive deals — enter your email" required>
      <button type="submit" class="btn btn-small-inline">Subscribe</button>
    </form>
  `);
}

function submitNewsletter(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value;
  subscribeToMailchimp(email).then(ok => {
    if (ok) {
      pushDL("sign_up", { method: "newsletter" });
      form.innerHTML = "<p>✅ Subscribed!</p>";
    } else {
      form.innerHTML = "<p>⚠️ Could not subscribe — try again later.</p>";
    }
  });
}

// Calls our Vercel serverless function (/api/subscribe.js), which holds the
// Mailchimp API key server-side. Never call Mailchimp directly from the browser.
function subscribeToMailchimp(email, name) {
  return fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name })
  }).then(r => r.json()).then(data => !!data.success).catch(() => false);
}

// ---- Wishlist ----
function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem("novagear_wishlist") || "[]");
  } catch (e) {
    return [];
  }
}

function toggleWishlist(id) {
  let list = getWishlist();
  const p = getProduct(id);
  if (!p) return;
  if (list.includes(id)) {
    list = list.filter(i => i !== id);
  } else {
    list.push(id);
    pushDL("add_to_wishlist", {
      ecommerce: {
        currency: "PKR",
        value: p.price,
        items: [{ item_id: p.id, item_name: p.name, item_category: p.category, price: p.price }]
      }
    });
  }
  localStorage.setItem("novagear_wishlist", JSON.stringify(list));
}

function toggleWishlistUI(event, id) {
  event.preventDefault();
  event.stopPropagation();
  toggleWishlist(id);
  event.currentTarget.textContent = getWishlist().includes(id) ? "❤️" : "🤍";
}

// ---- Cart (localStorage) ----
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("novagear_cart")) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("novagear_cart", JSON.stringify(cart));
  updateCartCount();
}

function addToCart(id, qty) {
  qty = qty || 1;
  const product = getProduct(id);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: id, qty: qty });
  }
  saveCart(cart);

  pushDL("add_to_cart", {
    ecommerce: {
      currency: "PKR",
      value: product.price * qty,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: qty
      }]
    }
  });
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  renderCartPage();
}

function updateQty(id, qty) {
  qty = parseInt(qty, 10);
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty = qty > 0 ? qty : 1;
    saveCart(cart);
  }
  renderCartPage();
}

function cartTotal() {
  return getCart().reduce((sum, item) => {
    const p = getProduct(item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartCount() {
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = cartCount();
  });
}

// ---- Page renderers ----
function renderProductGrid(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const wishlist = getWishlist();
  el.innerHTML = (list || PRODUCTS).map(p => `
    <div class="card">
      <a href="product.html?id=${p.id}" class="card-thumb" style="background:${p.color}">
        <span>${p.emoji}</span>
      </a>
      <button class="wishlist-btn" onclick="toggleWishlistUI(event,'${p.id}')" title="Save for later">${wishlist.includes(p.id) ? "❤️" : "🤍"}</button>
      <div class="card-body">
        <p class="card-cat">${p.category}</p>
        <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
        <p class="card-price">${formatPrice(p.price)}</p>
        <button class="btn btn-small" onclick="addToCart('${p.id}')">Add to Cart</button>
      </div>
    </div>
  `).join("");
}

function renderCategoryFilters() {
  const el = document.getElementById("category-filters");
  if (!el) return;
  const cats = ["All", ...new Set(PRODUCTS.map(p => p.category))];
  el.innerHTML = cats.map((c, i) => `<button class="chip${i === 0 ? " chip-active" : ""}" onclick="filterByCategory('${c}', event)">${c}</button>`).join("");
}

function filterByCategory(cat, event) {
  document.querySelectorAll(".chip").forEach(b => b.classList.remove("chip-active"));
  if (event) event.target.classList.add("chip-active");
  const list = cat === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);
  renderProductGrid("product-grid", list);
  pushDL("view_item_list", {
    item_list_name: cat,
    items: list.map(p => ({ item_id: p.id, item_name: p.name, item_category: p.category, price: p.price }))
  });
}

function handleSearch(term) {
  term = term.trim().toLowerCase();
  const list = term ? PRODUCTS.filter(p => p.name.toLowerCase().includes(term)) : PRODUCTS;
  renderProductGrid("product-grid", list);
  if (term) pushDL("search", { search_term: term });
}

function renderCartPage() {
  const wrap = document.getElementById("cart-items");
  if (!wrap) return;
  const cart = getCart();

  if (cart.length === 0) {
    wrap.innerHTML = `<p class="empty">Your cart is empty. <a href="shop.html">Go shopping →</a></p>`;
    document.getElementById("cart-total").textContent = formatPrice(0);
    return;
  }

  wrap.innerHTML = cart.map(item => {
    const p = getProduct(item.id);
    if (!p) return "";
    return `
      <div class="cart-row">
        <div class="cart-thumb" style="background:${p.color}">${p.emoji}</div>
        <div class="cart-info">
          <h4>${p.name}</h4>
          <p>${formatPrice(p.price)}</p>
        </div>
        <input type="number" min="1" value="${item.qty}" class="qty-input"
               onchange="updateQty('${p.id}', this.value)">
        <div class="cart-line-total">${formatPrice(p.price * item.qty)}</div>
        <button class="link-danger" onclick="removeFromCart('${p.id}')">Remove</button>
      </div>
    `;
  }).join("");

  document.getElementById("cart-total").textContent = formatPrice(cartTotal());

  pushDL("view_cart", {
    ecommerce: {
      currency: "PKR",
      value: cartTotal(),
      items: cart.map(item => {
        const p = getProduct(item.id);
        return {
          item_id: p.id, item_name: p.name, item_category: p.category,
          price: p.price, quantity: item.qty
        };
      })
    }
  });
}

function renderWishlistPage() {
  const wrap = document.getElementById("wishlist-items");
  if (!wrap) return;
  const ids = getWishlist();
  const items = ids.map(getProduct).filter(Boolean);

  if (items.length === 0) {
    wrap.innerHTML = `<p class="empty">Your wishlist is empty. <a href="shop.html">Browse products →</a></p>`;
    return;
  }

  wrap.innerHTML = `<div class="grid" id="wishlist-grid"></div>`;
  renderProductGrid("wishlist-grid", items);

  pushDL("view_item_list", {
    item_list_name: "Wishlist",
    items: items.map(p => ({ item_id: p.id, item_name: p.name, item_category: p.category, price: p.price }))
  });
}

function renderCheckoutSummary() {
  const el = document.getElementById("checkout-summary");
  if (!el) return;
  const cart = getCart();
  el.innerHTML = cart.map(item => {
    const p = getProduct(item.id);
    return `<div class="summary-row"><span>${p.name} × ${item.qty}</span><span>${formatPrice(p.price * item.qty)}</span></div>`;
  }).join("") + `<div class="summary-row summary-total"><span>Total</span><span>${formatPrice(cartTotal())}</span></div>`;

  pushDL("begin_checkout", {
    ecommerce: {
      currency: "PKR",
      value: cartTotal(),
      items: cart.map(item => {
        const p = getProduct(item.id);
        return { item_id: p.id, item_name: p.name, item_category: p.category, price: p.price, quantity: item.qty };
      })
    }
  });
}

function submitCheckout(event) {
  event.preventDefault();
  const cart = getCart();
  const orderId = "NG" + Date.now();
  const order = {
    orderId: orderId,
    value: cartTotal(),
    items: cart.map(item => {
      const p = getProduct(item.id);
      return { item_id: p.id, item_name: p.name, item_category: p.category, price: p.price, quantity: item.qty };
    }),
    attribution: getAttribution()
  };
  sessionStorage.setItem("novagear_last_order", JSON.stringify(order));
  saveCart([]); // clear cart
  window.location.href = "thank-you.html";
}

function renderThankYou() {
  const el = document.getElementById("order-summary");
  if (!el) return;
  const order = JSON.parse(sessionStorage.getItem("novagear_last_order") || "null");

  if (!order) {
    el.innerHTML = `<p>No recent order found. <a href="shop.html">Go shopping →</a></p>`;
    return;
  }

  const attribution = order.attribution || {};
  const attributionHtml = Object.keys(attribution).length
    ? `<div class="attribution-box"><strong>Attributed to:</strong><br>${Object.entries(attribution).map(([k, v]) => `${k}: ${v}`).join("<br>")}</div>`
    : `<div class="attribution-box"><em>No ad click parameters detected for this order (direct/organic visit).</em></div>`;

  el.innerHTML = `
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Total:</strong> ${formatPrice(order.value)}</p>
    <ul>${order.items.map(i => `<li>${i.item_name} × ${i.quantity}</li>`).join("")}</ul>
    ${attributionHtml}
  `;

  pushDL("purchase", {
    ecommerce: {
      transaction_id: order.orderId,
      currency: "PKR",
      value: order.value,
      items: order.items
    }
  });
}

// ---- Multi-step lead form (contact.html) ----
let leadFormData = {};

function goToStep(stepNum) {
  document.querySelectorAll(".form-step").forEach(el => el.classList.remove("form-step-active"));
  const target = document.getElementById("step-" + stepNum);
  if (target) target.classList.add("form-step-active");
  document.querySelectorAll(".step-dot").forEach((el, i) => {
    el.classList.toggle("step-dot-active", i < stepNum);
  });
}

function submitStep1(event) {
  event.preventDefault();
  leadFormData.name = event.target.name.value;
  leadFormData.email = event.target.email.value;
  leadFormData.phone = event.target.phone.value;
  pushDL("funnel_step", { step_name: "contact_info", step_number: 1 });
  goToStep(2);
}

function submitStep2(event) {
  event.preventDefault();
  leadFormData.interest = event.target.interest.value;
  leadFormData.budget = event.target.budget.value;
  pushDL("funnel_step", { step_name: "interest_budget", step_number: 2 });
  goToStep(3);
}

function submitStep3(event) {
  event.preventDefault();
  leadFormData.message = event.target.message.value;
  pushDL("generate_lead", {
    lead_form: "contact_page_multistep",
    lead_name: leadFormData.name,
    interest: leadFormData.interest,
    budget: leadFormData.budget,
    attribution: getAttribution()
  });
  subscribeToMailchimp(leadFormData.email, leadFormData.name);
  goToStep(4); // success step
}

// ---- Product page ----
function viewItem(id) {
  const p = getProduct(id);
  if (!p) return;
  pushDL("view_item", {
    ecommerce: {
      currency: "PKR",
      value: p.price,
      items: [{ item_id: p.id, item_name: p.name, item_category: p.category, price: p.price }]
    }
  });
}

// ---- Events Log page ----
function renderEventLog() {
  const tbody = document.getElementById("log-body");
  if (!tbody) return;
  const log = JSON.parse(sessionStorage.getItem("novagear_event_log") || "[]");
  if (log.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No events yet — browse the site (view a product, add to cart, checkout...) then come back here.</td></tr>`;
    return;
  }
  tbody.innerHTML = log.slice().reverse().map(entry => `
    <tr>
      <td>${entry.time}</td>
      <td>${entry.page}</td>
      <td><code>${entry.data.event || "(gtm internal)"}</code></td>
      <td><pre>${JSON.stringify(entry.data, null, 1)}</pre></td>
    </tr>
  `).join("");
}

function clearEventLog() {
  sessionStorage.removeItem("novagear_event_log");
  renderEventLog();
}

// Run on every page load
document.addEventListener("DOMContentLoaded", function () {
  updateCartCount();
  injectNewsletter();
  injectFloatingButtons();
  injectConsentBanner();
});
