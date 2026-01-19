import { ensureSeed, getDB, setDB, requireRole } from "./db.js";
import { applyI18n, getLang, t } from "./i18n.js";
import { escapeHtml, invoiceHtml, moneyLabel, showToast, statusLabel } from "./util.js";
import { renderNav } from "./nav.js";

const user = requireRole("driver");
if(!user){
  throw new Error("Unauthorized");
}

ensureSeed();
applyI18n(document);
renderNav();
const lang = getLang();

const ordersWrap = document.getElementById("ordersWrap");

const statuses = ["assigned", "on_the_way", "delivered", "canceled"];

function refreshDB(){
  return getDB() || ensureSeed();
}

function openInvoice(order){
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(invoiceHtml({ order, lang, t }));
  w.document.close();
}

function renderOrders(){
  const db = refreshDB();
  const orders = db.orders.filter(o => o.driverId === user.id).slice().reverse();

  if(orders.length === 0){
    ordersWrap.innerHTML = `<div class="empty">No assigned orders.</div>`;
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

renderOrders();
