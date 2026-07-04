/* =========================================================
   NovaGear – Ads Practice Store
   Shared logic: product catalog, cart (localStorage), and
   dataLayer events for Google Tag Manager practice.
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

// ---- dataLayer helper ----
function pushDL(event, payload) {
  const data = Object.assign({ event }, payload || {});
  window.dataLayer.push(data);
  console.log("[dataLayer push]", data);
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
  el.innerHTML = (list || PRODUCTS).map(p => `
    <div class="card">
      <a href="product.html?id=${p.id}" class="card-thumb" style="background:${p.color}">
        <span>${p.emoji}</span>
      </a>
      <div class="card-body">
        <p class="card-cat">${p.category}</p>
        <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
        <p class="card-price">${formatPrice(p.price)}</p>
        <button class="btn btn-small" onclick="addToCart('${p.id}')">Add to Cart</button>
      </div>
    </div>
  `).join("");
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
    })
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

  el.innerHTML = `
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Total:</strong> ${formatPrice(order.value)}</p>
    <ul>${order.items.map(i => `<li>${i.item_name} × ${i.quantity}</li>`).join("")}</ul>
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

function submitContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value;
  pushDL("generate_lead", {
    lead_form: "contact_page",
    lead_name: name
  });
  document.getElementById("contact-form").style.display = "none";
  document.getElementById("contact-success").style.display = "block";
}

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

// Run on every page load
document.addEventListener("DOMContentLoaded", updateCartCount);
