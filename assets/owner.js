import { ensureSeed, getDB, setDB, requireRole } from "./db.js";
import { applyI18n, getLang, t } from "./i18n.js";
import { escapeHtml, invoiceHtml, moneyLabel, showToast, statusLabel } from "./util.js";
import { renderNav } from "./nav.js";

const user = requireRole("owner");
if(!user){
  throw new Error("Unauthorized");
}

ensureSeed();
applyI18n(document);
renderNav();
const lang = getLang();

const restaurantsWrap = document.getElementById("restaurantsWrap");
const ordersWrap = document.getElementById("ordersWrap");

const statuses = ["new", "preparing", "assigned", "on_the_way", "delivered", "canceled"];

function refreshDB(){
  return getDB() || ensureSeed();
}

function openInvoice(order){
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(invoiceHtml({ order, lang, t }));
  w.document.close();
}

function renderRestaurants(){
  const db = refreshDB();
  const list = db.restaurants.filter(r => r.ownerId === user.id);
  if(list.length === 0){
    restaurantsWrap.innerHTML = `<div class="empty">No restaurants yet.</div>`;
    return;
  }

  restaurantsWrap.innerHTML = list.map(r => {
    const products = db.products.filter(p => p.restId === r.id);
    return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">
          <div>
            <strong>${escapeHtml(r.name)}</strong>
            <div class="hint">${escapeHtml(r.category)} • ${escapeHtml(r.city || "")}</div>
          </div>
          <span class="badge">${products.length} items</span>
        </div>
        <div class="products">
          ${products.map(p => `
            <div class="product" style="grid-template-columns:80px 1fr auto">
              <img src="${escapeHtml(p.image || "")}" alt="${escapeHtml(p.name)}"/>
              <div class="product-info">
                <h4 style="margin:0 0 4px">${escapeHtml(p.name)}</h4>
                <p>${escapeHtml(p.desc || "")}</p>
              </div>
              <div class="price">${moneyLabel(p.price)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function renderOrders(){
  const db = refreshDB();
  const restIds = new Set(db.restaurants.filter(r => r.ownerId === user.id).map(r => r.id));
  const orders = db.orders
    .filter(o => (o.items || []).some(item => restIds.has(item.restId)))
    .slice()
    .reverse();

  if(orders.length === 0){
    ordersWrap.innerHTML = `<div class="empty">No orders yet.</div>`;
    return;
  }

  ordersWrap.innerHTML = `
    <div style="overflow:auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Customer</th>
            <th>${escapeHtml(t("total"))}</th>
            <th>${escapeHtml(t("status"))}</th>
            <th>${escapeHtml(t("print"))}</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => {
            const cust = order.customer || {};
            const statusOptions = statuses.map(st => `<option value="${st}" ${order.status === st ? "selected" : ""}>${escapeHtml(statusLabel(st, lang))}</option>`).join("");
            return `
              <tr>
                <td>${escapeHtml(order.id.slice(0,8))}</td>
                <td>${escapeHtml(new Date(order.createdAt).toLocaleString())}</td>
                <td>${escapeHtml(cust.name || "")}</td>
                <td><strong>${moneyLabel(order.grandTotal)}</strong></td>
                <td>
                  <select class="input" data-status="${order.id}">${statusOptions}</select>
                </td>
                <td><button class="btn ghost" data-inv="${order.id}">${escapeHtml(t("print"))}</button></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  ordersWrap.querySelectorAll("[data-status]").forEach(sel => {
    sel.addEventListener("change", () => {
      const dbNow = refreshDB();
      const order = dbNow.orders.find(o => o.id === sel.getAttribute("data-status"));
      if(!order) return;
      order.status = sel.value;
      setDB(dbNow);
      showToast("Status updated ✅");
    });
  });

  ordersWrap.querySelectorAll("[data-inv]").forEach(btn => {
    btn.addEventListener("click", () => {
      const dbNow = refreshDB();
      const order = dbNow.orders.find(o => o.id === btn.getAttribute("data-inv"));
      if(order) openInvoice(order);
    });
  });
}

renderRestaurants();
renderOrders();
