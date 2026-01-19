import { ensureSeed, currentUser } from "./db.js";
import { fmtRole } from "./util.js";
import { t } from "./i18n.js";

export function renderNav(){
  const db = ensureSeed();
  const u = currentUser(db);

  const userEl = document.getElementById("navUser");
  const linksEl = document.getElementById("navLinks");

  if(!userEl || !linksEl) return;

  if(!u){
    userEl.innerHTML = `<span class="hint">—</span>`;
    linksEl.innerHTML = `
      <a class="btn ghost" href="login.html">${t("login")}</a>
      <a class="btn" href="register.html">${t("register")}</a>
    `;
    return;
  }

  userEl.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="badge">${fmtRole(u.role)}</span>
      <span style="font-weight:900">${u.name}</span>
      <span class="hint">${u.email}</span>
    </div>
  `;

  const common = `<a class="btn ghost" href="app.html">${t("customerApp")}</a>`;
  const admin = u.role === "admin" ? `<a class="btn ghost" href="admin.html">${t("admin")}</a>` : "";
  const owner = u.role === "owner" ? `<a class="btn ghost" href="owner.html">${t("owner")}</a>` : "";
  const driver = u.role === "driver" ? `<a class="btn ghost" href="driver.html">${t("driver")}</a>` : "";

  linksEl.innerHTML = `
    ${common}
    ${admin}
    ${owner}
    ${driver}
    <button class="btn secondary" id="logoutBtn">${t("logout")}</button>
  `;

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", ()=>{
    localStorage.removeItem("FW_SESSION_V1");
    location.href = "index.html";
  });
}
