export function money(n){
  return Number(n || 0).toFixed(2);
}

export function moneyLabel(n, currency="MAD"){
  const v = Number(n || 0).toFixed(2);
  return currency === "MAD" ? `${v} د.م` : `${v} MAD`;
}

export function uuid(prefix="id"){
  return prefix + "-" + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function showToast(msg){
  const toast = document.getElementById("toast");
  if(!toast) return alert(msg);
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> toast.classList.remove("show"), 2200);
}

export function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[s]);
}

export function makeSvgDataUrl(text){
  const safe = String(text).slice(0,16).replace(/[<>&]/g,"");
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="220">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#111"/>
        <stop offset="100%" stop-color="#ff5722"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="26" fill="white" font-weight="700">${safe}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

export function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function fmtRole(role){
  if(role === "admin") return "مسؤول";
  if(role === "owner") return "مالك مطعم";
  if(role === "driver") return "مندوب";
  return "زبون";
}

export function statusLabel(s, lang="ar"){
  const ar = { new:"جديد", preparing:"قيد التحضير", assigned:"مُسند للمندوب", on_the_way:"في الطريق", delivered:"تم التسليم", canceled:"ملغي" };
  const en = { new:"New", preparing:"Preparing", assigned:"Assigned", on_the_way:"On the way", delivered:"Delivered", canceled:"Canceled" };
  const map = lang==="en" ? en : ar;
  return map[s] || s;
}

export function invoiceHtml({order, lang="ar", t, currency="MAD"}){
  const created = new Date(order.createdAt).toLocaleString(lang==="en" ? "en-US":"ar-MA");
  const cust = order.customer || {};
  const items = order.items || [];
  const title = lang==="en" ? "Invoice" : "فاتورة";
  const orderNo = lang==="en" ? "Order" : "الطلب";
  const phone = lang==="en" ? "Phone" : "الهاتف";
  const city = lang==="en" ? "City" : "المدينة";
  const address = lang==="en" ? "Address" : "العنوان";
  const pay = lang==="en" ? "Payment" : "الدفع";
  const note = lang==="en" ? "Note" : "ملاحظة";
  const status = lang==="en" ? "Status" : "الحالة";

  const thItem = lang==="en" ? "Item" : "المنتج";
  const thRest = lang==="en" ? "Restaurant" : "المطعم";
  const thQty = lang==="en" ? "Qty" : "الكمية";
  const thPrice = lang==="en" ? "Price" : "السعر";
  const thTotal = lang==="en" ? "Total" : "المجموع";

  const sub = order.subTotal || 0;
  const delivery = order.deliveryFee || 0;
  const disc = order.discount || 0;
  const grand = order.grandTotal || 0;

  const m = (x)=> moneyLabel(x, currency);

  return `
  <!doctype html>
  <html lang="${lang}" dir="${lang==="en"?"ltr":"rtl"}">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title} - ${order.id}</title>
    <link rel="stylesheet" href="assets/styles.css"/>
  </head>
  <body>
    <div class="invoice">
      <div class="invoice-header">
        <div class="invoice-brand">
          <div class="invoice-logo">🍽️</div>
          <div>
            <h2>${lang==="en" ? "Food Ordering Platform" : "منصة طلب الطعام"}</h2>
            <div class="invoice-meta">${title} • ${orderNo} #${order.id}</div>
          </div>
        </div>
        <div class="invoice-meta">
          <div><strong>${lang==="en"?"Date":"التاريخ"}:</strong> ${created}</div>
          <div><strong>${status}:</strong> ${statusLabel(order.status, lang)}</div>
          ${order.driverName ? `<div><strong>${lang==="en"?"Driver":"المندوب"}:</strong> ${escapeHtml(order.driverName)}</div>` : ``}
        </div>
      </div>

      <hr/>

      <div class="invoice-meta" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <div><strong>${lang==="en"?"Customer":"الزبون"}:</strong> ${escapeHtml(cust.name||"")}</div>
          <div><strong>${phone}:</strong> ${escapeHtml(cust.phone||"")}</div>
          <div><strong>${city}:</strong> ${escapeHtml(cust.city||"")}</div>
        </div>
        <div>
          <div><strong>${address}:</strong> ${escapeHtml(cust.address||"")}</div>
          <div><strong>${pay}:</strong> ${escapeHtml(cust.pay==="card" ? (lang==="en"?"Card (demo)":"بطاقة (محاكاة)") : (lang==="en"?"Cash":"نقداً"))}</div>
          ${cust.note ? `<div><strong>${note}:</strong> ${escapeHtml(cust.note)}</div>` : ``}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${thItem}</th>
            <th>${thRest}</th>
            <th>${thQty}</th>
            <th>${thPrice}</th>
            <th>${thTotal}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it=>{
            const rowTotal = (it.price||0) * (it.qty||0);
            return `
              <tr>
                <td><strong>${escapeHtml(it.name||"")}</strong></td>
                <td>${escapeHtml(it.restName||"")}</td>
                <td>${escapeHtml(String(it.qty||0))}</td>
                <td>${m(it.price||0)}</td>
                <td><strong>${m(rowTotal)}</strong></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div class="tot">
        <div class="row"><span>${lang==="en"?"Subtotal":"المجموع الفرعي"}</span><span>${m(sub)}</span></div>
        <div class="row"><span>${lang==="en"?"Delivery":"التوصيل"}</span><span>${m(delivery)}</span></div>
        <div class="row"><span>${lang==="en"?"Discount":"الخصم"}</span><span>- ${m(disc)}</span></div>
        <div class="row"><strong>${lang==="en"?"Grand Total":"الإجمالي"}</strong><strong>${m(grand)}</strong></div>
      </div>

      <div class="no-print" style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn" onclick="window.print()">${lang==="en"?"Print":"طباعة"}</button>
        <button class="btn ghost" onclick="window.close()">${lang==="en"?"Close":"إغلاق"}</button>
      </div>
    </div>
  </body>
  </html>
  `;
}
