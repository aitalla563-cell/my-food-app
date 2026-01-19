import { ensureSeed, getDB, setDB, requireRole } from "./db.js";
import { applyI18n, getLang, t } from "./i18n.js";
import { escapeHtml, invoiceHtml, moneyLabel, showToast, statusLabel } from "./util.js";
import { renderNav } from "./nav.js";

const user = requireRole("admin");
if(!user){
  throw new Error("Unauthorized");
}

ensureSeed();
applyI18n(document);
renderNav();
const lang = getLang();

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

function renderOrders(){
  const db = refreshDB();
  const drivers = db.users.filter(u => u.role === "driver");
  const orders = db.orders.slice().reverse();

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
            <th>${escapeHtml(t("assignedDriver"))}</th>
            <th>${escapeHtml(t("print"))}</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => {
            const cust = order.customer || {};
            const driverOptions = [
              `<option value="">${lang === "en" ? "Unassigned" : "غير مسند"}</option>`,
              ...drivers.map(d => `<option value="${d.id}" ${order.driverId === d.id ? "selected" : ""}>${escapeHtml(d.name)}</option>`)
            ].join("");
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
                <td>
                  <select class="input" data-driver="${order.id}">${driverOptions}</select>
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

  ordersWrap.querySelectorAll("[data-driver]").forEach(sel => {
    sel.addEventListener("change", () => {
      const dbNow = refreshDB();
      const order = dbNow.orders.find(o => o.id === sel.getAttribute("data-driver"));
      if(!order) return;
      order.driverId = sel.value || null;
      const driver = drivers.find(d => d.id === sel.value);
      order.driverName = driver ? driver.name : null;
      if(order.driverId && order.status === "new"){
        order.status = "assigned";
      }
      setDB(dbNow);
      renderOrders();
      showToast("Driver updated ✅");
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
