import { ensureSeed, getDB, setDB, requireAuth, getCart, setCart, clearCart, FEES, COUPONS } from "./db.js";
import { moneyLabel, makeSvgDataUrl, showToast, escapeHtml, invoiceHtml } from "./util.js";
import { applyI18n, getLang, t } from "./i18n.js";

const user = requireAuth("login.html");
if(!user){
  throw new Error("Unauthorized");
}
let db = ensureSeed();
applyI18n(document);
const lang = getLang();

const restaurantsWrap = document.getElementById("restaurantsWrap");
const searchInput = document.getElementById("searchInput");
const catSelect = document.getElementById("catSelect");
const resultsHint = document.getElementById("resultsHint");

const cartWrap = document.getElementById("cartWrap");
const cartCount = document.getElementById("cartCount");
const subTotalEl = document.getElementById("subTotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const discountEl = document.getElementById("discount");
const grandTotalEl = document.getElementById("grandTotal");

const couponInput = document.getElementById("couponInput");
const applyCouponBtn = document.getElementById("applyCouponBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const openCheckoutBtn = document.getElementById("openCheckoutBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

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

const ordersBtn = document.getElementById("ordersBtn");
const ordersOverlay = document.getElementById("ordersOverlay");
const closeOrdersBtn = document.getElementById("closeOrdersBtn");
const ordersWrap = document.getElementById("ordersWrap");

const state = {
  search:"",
  category:"all",
  coupon: loadCoupon()
};

function loadCoupon(){
  try{
    const raw = localStorage.getItem("FW_COUPON_"+user.id);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveCoupon(){
  localStorage.setItem("FW_COUPON_"+user.id, JSON.stringify(state.coupon));
}

function refreshDB(){ db = getDB() || ensureSeed(); }

function cartObj(){ return getCart(user.id); }
function itemsArray(){ return Object.values(cartObj() || {}); }
function cartCountTotal(){ return itemsArray().reduce((s,it)=> s + (it.qty||0), 0); }
function calcSubTotal(){ return itemsArray().reduce((s,it)=> s + (it.price*it.qty), 0); }
function calcDeliveryFee(sub){ if(sub<=0) return 0; if(sub>=FEES.freeOver) return 0; return FEES.baseDelivery; }
function calcDiscount(sub){
  if(!state.coupon) return 0;
  const cp = state.coupon;
  let disc = 0;
  if(cp.type==="percent") disc = sub*(cp.value/100);
  if(cp.type==="fixed") disc = cp.value;
  return Math.min(disc, sub);
}

function buildCategories(){
  const cats = Array.from(new Set(db.restaurants.map(r=> r.category))).sort();
  catSelect.innerHTML = `<option value="all">${escapeHtml(t("allCats"))}</option>` +
    cats.map(c=> `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function getFilteredRestaurants(){
  const q = state.search.trim().toLowerCase();
  return db.restaurants
    .filter(r => state.category==="all" ? true : r.category === state.category)
    .map(r => {
      const products = db.products
        .filter(p => p.restId === r.id && p.available)
        .filter(p => {
          if(!q) return true;
          const hay = (r.name+" "+r.category+" "+p.name+" "+p.desc).toLowerCase();
          return hay.includes(q);
        });
      return {...r, products};
    })
    .filter(r => {
      if(!q) return true;
      const matchRest = (r.name+" "+r.category+" "+(r.tags||[]).join(" ")).toLowerCase().includes(q);
      return matchRest || r.products.length>0;
    });
}

function imgFor(item, fallbackText){
  const v = item?.image || item?.cover || "";
  if(v) return v;
  return makeSvgDataUrl(fallbackText || "Food");
}

function renderRestaurants(){
  refreshDB();
  const list = getFilteredRestaurants();
  const totalProducts = list.reduce((s,r)=> s + r.products.length, 0);
  resultsHint.textContent = `${list.length} restaurants • ${totalProducts} products`;

  if(list.length===0){
    restaurantsWrap.innerHTML = `<div class="empty">No results</div>`;
    return;
  }

  const cart = cartObj();

  restaurantsWrap.innerHTML = list.map(rest => {
    const initials = rest.name.split(" ").slice(0,2).map(w=> w[0]).join("").toUpperCase();
    const prodsHtml = rest.products.map(p => {
      const qty = cart[p.id]?.qty || 0;
      return `
        <div class="product">
          <img alt="${escapeHtml(p.name)}" src="${escapeHtml(imgFor(p, p.name))}" />
          <div class="product-info">
            <h4 title="${escapeHtml(p.name)}">
              <a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a>
            </h4>
            <p>${escapeHtml(p.desc)}</p>
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

    const tags = (rest.tags||[]).map(tg=> `<span class="tag">${escapeHtml(tg)}</span>`).join("");
    const cover = imgFor(rest, rest.name);
    return `
      <article class="rest">
        <div style="height:140px;background:#f3f4f6;border-bottom:1px solid var(--border)">
          <img alt="${escapeHtml(rest.name)}" src="${escapeHtml(cover)}" style="width:100%;height:140px;object-fit:cover"/>
        </div>
        <div class="rest-top">
          <div class="rest-ava">${escapeHtml(initials)}</div>
          <div class="rest-meta">
            <h3><a href="restaurant.html?id=${encodeURIComponent(rest.id)}">${escapeHtml(rest.name)}</a></h3>
            <p>${escapeHtml(rest.category)} • ⭐ ${rest.rating} • ⏱ ${rest.etaMin}m • ${escapeHtml(rest.city||"")}</p>
          </div>
        </div>
        <div class="rest-tags">${tags}</div>
        <div class="products">
          ${rest.products.length ? prodsHtml : `<div class="empty">No matching products</div>`}
        </div>
      </article>
    `;
  }).join("");

  restaurantsWrap.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=> addToCart(btn.getAttribute("data-add")));
  });
  restaurantsWrap.querySelectorAll("[data-inc]").forEach(btn=>{
    btn.addEventListener("click", ()=> addToCart(btn.getAttribute("data-inc")));
  });
  restaurantsWrap.querySelectorAll("[data-dec]").forEach(btn=>{
    btn.addEventListener("click", ()=> decQty(btn.getAttribute("data-dec")));
  });
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
  showToast("Removed 🗑️");
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
  const disc = calcDiscount(sub);
  const grand = Math.max(0, sub + delivery - disc);

  subTotalEl.textContent = moneyLabel(sub);
  deliveryFeeEl.textContent = moneyLabel(delivery);
  discountEl.textContent = "- " + moneyLabel(disc);
  grandTotalEl.textContent = moneyLabel(grand);

  if(state.coupon) couponInput.value = state.coupon.code;
  checkoutBtn.disabled = items.length===0;
  openCheckoutBtn.disabled = items.length===0;
}

function applyCoupon(){
  const code = couponInput.value.trim().toUpperCase();
  if(!code){
    state.coupon = null;
    saveCoupon();
    renderCart();
    showToast("Coupon removed");
    return;
  }
  const cp = COUPONS[code];
  if(!cp){
    state.coupon = null;
    saveCoupon();
    renderCart();
    showToast("Invalid coupon");
    return;
  }
  state.coupon = { code, ...cp };
  saveCoupon();
  renderCart();
  showToast("Coupon applied ✅");
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
  const disc = calcDiscount(sub);
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
    coupon: state.coupon ? state.coupon.code : null
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
  state.coupon = null;
  saveCoupon();
  renderCart();
  renderRestaurants();

  closeCheckout();
  showToast("Order confirmed ✅");

  setTimeout(()=> openInvoice(order), 100);

  nameInput.value = "";
  phoneInput.value = "";
  cityInput.value = "";
  addressInput.value = "";
  noteInput.value = "";
  paySelect.value = "cash";
}

function printInvoice(){
  const customer = validateCheckout();
  if(!customer){ showToast("Fill required fields"); return; }
  if(itemsArray().length===0){ showToast("Cart empty"); return; }
  const order = buildOrderDraft(customer);
  openInvoice(order);
}

/* Orders modal */
function openOrders(){
  ordersOverlay.classList.add("show");
  renderOrders();
}
function closeOrders(){ ordersOverlay.classList.remove("show"); }

function renderOrders(){
  refreshDB();
  const my = db.orders.filter(o => o.userId === user.id).slice().reverse();
  if(my.length===0){
    ordersWrap.innerHTML = `<div class="empty">No orders yet.</div>`;
    return;
  }
  ordersWrap.innerHTML = `
    <div style="overflow:auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th><th>Date</th><th>${escapeHtml(t("orderStatus"))}</th><th>Total</th><th>Invoice</th>
          </tr>
        </thead>
        <tbody>
          ${my.map(o=>`
            <tr>
              <td>${escapeHtml(o.id.slice(0,8))}</td>
              <td>${escapeHtml(new Date(o.createdAt).toLocaleString())}</td>
              <td><span class="badge">${escapeHtml(o.status)}</span></td>
              <td><strong>${moneyLabel(o.grandTotal)}</strong></td>
              <td><button class="btn ghost" data-inv="${o.id}">${escapeHtml(t("print"))}</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  ordersWrap.querySelectorAll("[data-inv]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-inv");
      const o = db.orders.find(x=> x.id===id);
      if(o) openInvoice(o);
    });
  });
}

/* Events */
searchInput.addEventListener("input", e=>{ state.search = e.target.value; renderRestaurants(); });
catSelect.addEventListener("change", e=>{ state.category = e.target.value; renderRestaurants(); });
applyCouponBtn.addEventListener("click", applyCoupon);
couponInput.addEventListener("keydown", e=>{ if(e.key==="Enter") applyCoupon(); });

clearCartBtn.addEventListener("click", ()=>{
  clearCart(user.id);
  state.coupon = null; saveCoupon();
  renderCart(); renderRestaurants();
  showToast("Cart cleared");
});

checkoutBtn.addEventListener("click", openCheckout);
openCheckoutBtn.addEventListener("click", openCheckout);
closeCheckoutBtn.addEventListener("click", closeCheckout);
checkoutOverlay.addEventListener("click", e=>{ if(e.target===checkoutOverlay) closeCheckout(); });
confirmOrderBtn.addEventListener("click", confirmOrder);
printBtn.addEventListener("click", printInvoice);

ordersBtn.addEventListener("click", openOrders);
closeOrdersBtn.addEventListener("click", closeOrders);
ordersOverlay.addEventListener("click", e=>{ if(e.target===ordersOverlay) closeOrders(); });

clearFiltersBtn.addEventListener("click", ()=>{
  state.search=""; state.category="all";
  searchInput.value=""; catSelect.value="all";
  renderRestaurants();
  showToast("Filters cleared");
});

/* Init */
refreshDB();
buildCategories();
renderRestaurants();
renderCart();
