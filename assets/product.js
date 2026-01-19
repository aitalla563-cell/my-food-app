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
const prodId = params.get("id");

const prodName = document.getElementById("prodName");
const prodMeta = document.getElementById("prodMeta");
const productCard = document.getElementById("productCard");

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
}
function removeItem(productId){
  const cart = cartObj();
  if(cart[productId]) delete cart[productId];
  setCart(user.id, cart);
  renderCart();
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

function renderProduct(){
  refreshDB();
  const p = db.products.find(x=> x.id===prodId);
  if(!p){
    prodName.textContent = "Not Found";
    productCard.innerHTML = `<div class="empty">Product not found.</div>`;
    return;
  }
  const rest = db.restaurants.find(r=> r.id===p.restId);
  prodName.textContent = p.name;
  prodMeta.textContent = `${rest?.name || ""} • ${rest?.city || ""}`;

  productCard.innerHTML = `
    <div class="product" style="grid-template-columns:140px 1fr auto">
      <img alt="${escapeHtml(p.name)}" src="${escapeHtml(imgFor(p, p.name))}" style="width:140px;height:120px"/>
      <div class="product-info">
        <h3 style="margin:0 0 6px">${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.desc || "")}</p>
        <div class="price">${moneyLabel(p.price)}</div>
      </div>
      <div class="product-actions">
        <button class="add-btn" id="addProdBtn">Add</button>
        <a class="btn ghost" href="restaurant.html?id=${encodeURIComponent(p.restId)}">${escapeHtml(t("restaurantsAndMeals"))}</a>
      </div>
    </div>
  `;

  document.getElementById("addProdBtn")?.addEventListener("click", ()=> addToCart(p.id));
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

renderProduct();
renderCart();
