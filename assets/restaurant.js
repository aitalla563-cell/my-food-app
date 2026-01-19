import { ensureSeed, getDB, setDB, requireAuth, getCart, setCart, clearCart, FEES } from "./db.js";
import { moneyLabel, makeSvgDataUrl, showToast, escapeHtml, invoiceHtml } from "./util.js";
import { applyI18n, getLang, t } from "./i18n.js";

const user = requireAuth("login.html");
if(!user){
  throw new Error("Unauthorized");
}
let db = ensureSeed();
applyI18n(document);
const lang = getLang();

const params = new URLSearchParams(location.search);
const restId = params.get("id");

const restName = document.getElementById("restName");
const restMeta = document.getElementById("restMeta");
const hero = document.getElementById("hero");
const productsWrap = document.getElementById("productsWrap");
const resultsHint = document.getElementById("resultsHint");

const cartWrap = document.getElementById("cartWrap");
const cartCount = document.getElementById("cartCount");
const subTotalEl = document.getElementById("subTotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const discountEl = document.getElementById("discount");
const grandTotalEl = document.getElementById("grandTotal");

const clearCartBtn = document.getElementById("clearCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const openCheckoutBtn = document.getElementById("openCheckoutBtn");

const checkoutOverlay = document.getElementById("checkoutOverlay");
const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");
const printBtn = document.getElementById("printBtn");

const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const cityInput = document.getElementById("cityInput");
const addressInput = document.getElementById("addressInput");
const noteInput = document.getElementById("noteInput");
const paySelect = document.getElementById("paySelect");

function refreshDB(){ db = getDB() || ensureSeed(); }
function cartObj(){ return getCart(user.id); }
function itemsArray(){ return Object.values(cartObj() || {}); }
function cartCountTotal(){ return itemsArray().reduce((s,it)=> s + (it.qty||0), 0); }
function calcSubTotal(){ return itemsArray().reduce((s,it)=> s + (it.price*it.qty), 0); }
function calcDeliveryFee(sub){ if(sub<=0) return 0; if(sub>=150) return 0; return FEES.baseDelivery; }

function imgFor(item, fallbackText){
  const v = item?.image || item?.cover || "";
  if(v) return v;
  return makeSvgDataUrl(fallbackText || "Food");
}

function addToCart(productId){
  refreshDB();
  const p = db.products.find(x=> x.id===productId);
  if(!p) return;
  const rest = db.restaurants.find(r=> r.id===p.restId);
  const cart = cartObj();
  if(cart[productId]) cart[productId].qty += 1;
  else cart[productId] = { id: productId, name: p.name, price: p.price, qty:1, restId: p.restId, restName: rest?.name || "" };
  setCart(user.id, cart);
  renderCart();
  const qtyEl = document.getElementById("qty_"+productId);
  if(qtyEl) qtyEl.textContent = cart[productId].qty;
  showToast("Added ✅");
}
function decQty(productId){
  const cart = cartObj();
  const it = cart[productId];
  if(!it) return;
  it.qty -= 1;
  if(it.qty<=0) delete cart[productId];
  setCart(user.id, cart);
  renderCart();
  const qtyEl = document.getElementById("qty_"+productId);
  if(qtyEl) qtyEl.textContent = cart[productId]?.qty || 0;
}
function removeItem(productId){
  const cart = cartObj();
  if(cart[productId]) delete cart[productId];
  setCart(user.id, cart);
  renderCart();
  const qtyEl = document.getElementById("qty_"+productId);
  if(qtyEl) qtyEl.textContent = 0;
}

function renderCart(){
  const cart = cartObj();
  const items = Object.values(cart);
  cartCount.textContent = cartCountTotal();

  if(items.length===0){
    cartWrap.innerHTML = `<div class="empty">Cart is empty</div>`;
  }else{
    cartWrap.innerHTML = items.map(it=>`
      <div class="cart-item">
        <div>
          <h4>${escapeHtml(it.name)}</h4>
          <small>${escapeHtml(it.restName)} • ${moneyLabel(it.price)} × ${it.qty}</small>
        </div>
        <div class="cart-right">
          <div class="qty-row" style="min-width:110px">
            <button class="qty-btn" data-dec="${it.id}">−</button>
            <div class="qty">${it.qty}</div>
            <button class="qty-btn" data-inc="${it.id}">+</button>
          </div>
          <button class="remove" data-rm="${it.id}">X</button>
        </div>
      </div>
    `).join("");

    cartWrap.querySelectorAll("[data-inc]").forEach(b=> b.addEventListener("click", ()=> addToCart(b.getAttribute("data-inc"))));
    cartWrap.querySelectorAll("[data-dec]").forEach(b=> b.addEventListener("click", ()=> decQty(b.getAttribute("data-dec"))));
    cartWrap.querySelectorAll("[data-rm]").forEach(b=> b.addEventListener("click", ()=> removeItem(b.getAttribute("data-rm"))));
  }

  const sub = calcSubTotal();
  const delivery = calcDeliveryFee(sub);
  const disc = 0;
  const grand = Math.max(0, sub + delivery - disc);

  subTotalEl.textContent = moneyLabel(sub);
  deliveryFeeEl.textContent = moneyLabel(delivery);
  discountEl.textContent = "- " + moneyLabel(disc);
  grandTotalEl.textContent = moneyLabel(grand);

  checkoutBtn.disabled = items.length===0;
  openCheckoutBtn.disabled = items.length===0;
}

function openCheckout(){
  if(itemsArray().length===0){ showToast("Cart empty"); return; }
  checkoutOverlay.classList.add("show");
}
function closeCheckout(){ checkoutOverlay.classList.remove("show"); }
function validateCheckout(){
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const city = cityInput.value.trim();
  const address = addressInput.value.trim();
  if(!name || !phone || !city || !address) return null;
  return { name, phone, city, address, note: noteInput.value.trim(), pay: paySelect.value };
}
function buildOrderDraft(customer){
  const cart = cartObj();
  const items = Object.values(cart);
  const sub = calcSubTotal();
  const delivery = calcDeliveryFee(sub);
  const disc = 0;
  const grand = Math.max(0, sub + delivery - disc);
  return {
    id: (crypto.randomUUID ? crypto.randomUUID() : ("o-"+Math.random().toString(16).slice(2))),
    userId: user.id,
    createdAt: new Date().toISOString(),
    status: "new",
    driverId: null,
    driverName: null,
    customer,
    items: items.map(it => ({ productId: it.id, name: it.name, price: it.price, qty: it.qty, restId: it.restId || "", restName: it.restName })),
    subTotal: sub,
    deliveryFee: delivery,
    discount: disc,
    grandTotal: grand,
    coupon: null
  };
}
function openInvoice(order){
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(invoiceHtml({ order, lang, t }));
  w.document.close();
}
function confirmOrder(){
  refreshDB();
  const customer = validateCheckout();
  if(!customer){ showToast("Fill required fields"); return; }
  const order = buildOrderDraft(customer);
  db.orders.push(order);
  setDB(db);
  clearCart(user.id);
  renderCart();
  closeCheckout();
  showToast("Order confirmed ✅");
  setTimeout(()=> openInvoice(order), 100);
}
function printInvoice(){
  const customer = validateCheckout();
  if(!customer){ showToast("Fill required fields"); return; }
  if(itemsArray().length===0){ showToast("Cart empty"); return; }
  openInvoice(buildOrderDraft(customer));
}

function render(){
  refreshDB();
  const rest = db.restaurants.find(r=> r.id===restId);
  if(!rest){
    restName.textContent = "Not Found";
    productsWrap.innerHTML = `<div class="empty">Restaurant not found.</div>`;
    return;
  }
  restName.textContent = rest.name;
  restMeta.textContent = `${rest.category} • ⭐ ${rest.rating} • ⏱ ${rest.etaMin}m • ${rest.city||""}`;

  hero.innerHTML = `
    <div style="height:220px;background:#f3f4f6">
      <img src="${escapeHtml(imgFor(rest, rest.name))}" alt="${escapeHtml(rest.name)}" style="width:100%;height:220px;object-fit:cover"/>
    </div>
    <div style="padding:12px">
      <div class="flex" style="justify-content:space-between">
        <div>
          <div class="hint">${escapeHtml(rest.address||"")}</div>
          <div class="small">${escapeHtml(rest.phone||"")}</div>
        </div>
        <a class="btn ghost" href="app.html">${t("customerApp")}</a>
      </div>
    </div>
  `;

  const products = db.products.filter(p=> p.restId===rest.id && p.available);
  resultsHint.textContent = `${products.length} products`;

  const cart = cartObj();
  productsWrap.innerHTML = products.map(p=>{
    const qty = cart[p.id]?.qty || 0;
    return `
      <div class="product">
        <img alt="${escapeHtml(p.name)}" src="${escapeHtml(imgFor(p, p.name))}"/>
        <div class="product-info">
          <h4><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></h4>
          <p>${escapeHtml(p.desc||"")}</p>
          <div class="price">${moneyLabel(p.price)}</div>
        </div>
        <div class="product-actions">
          <div class="qty-row">
            <button class="qty-btn" data-dec="${p.id}">−</button>
            <div class="qty" id="qty_${p.id}">${qty}</div>
            <button class="qty-btn" data-inc="${p.id}">+</button>
          </div>
          <button class="add-btn" data-add="${p.id}">Add</button>
        </div>
      </div>
    `;
  }).join("");

  productsWrap.querySelectorAll("[data-add]").forEach(btn=> btn.addEventListener("click", ()=> addToCart(btn.getAttribute("data-add"))));
  productsWrap.querySelectorAll("[data-inc]").forEach(btn=> btn.addEventListener("click", ()=> addToCart(btn.getAttribute("data-inc"))));
  productsWrap.querySelectorAll("[data-dec]").forEach(btn=> btn.addEventListener("click", ()=> decQty(btn.getAttribute("data-dec"))));
}

/* Events */
clearCartBtn.addEventListener("click", ()=>{
  clearCart(user.id);
  renderCart();
  showToast("Cart cleared");
});
checkoutBtn.addEventListener("click", openCheckout);
openCheckoutBtn.addEventListener("click", openCheckout);
closeCheckoutBtn.addEventListener("click", closeCheckout);
checkoutOverlay.addEventListener("click", e=>{ if(e.target===checkoutOverlay) closeCheckout(); });
confirmOrderBtn.addEventListener("click", confirmOrder);
printBtn.addEventListener("click", printInvoice);

render();
renderCart();
