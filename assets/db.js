import { uuid } from "./util.js";

/**
 * Front-End only DB using LocalStorage.
 */

const DB_KEY = "FW_DB_V2";
const SESSION_KEY = "FW_SESSION_V1";

export const FEES = {
  baseDelivery: 15.0,
  freeOver: 150.0
};

export const COUPONS = {
  "SAVE10": { type: "percent", value: 10 },
  "LESS20": { type: "fixed", value: 20 }
};

export function getDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}
export function setDB(db){
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDB(){
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  // carts & coupons remain per-user keys; keep simple
}

export function ensureSeed(){
  let db = getDB();
  if(db) return db;

  const adminId = uuid("u");
  const ownerId = uuid("u");
  const driverId = uuid("u");
  const customerId = uuid("u");

  const sha = (str)=> {
    let h = 0;
    for(let i=0;i<str.length;i++){ h = (h<<5) - h + str.charCodeAt(i); h |= 0; }
    return "h" + (h >>> 0).toString(16);
  };

  db = {
    meta: { createdAt: new Date().toISOString(), version: 2 },
    users: [
      { id: adminId, name:"Admin", email:"admin@demo.com", passHash: sha("Admin123"), role:"admin", createdAt:new Date().toISOString() },
      { id: ownerId, name:"Restaurant Owner", email:"owner@demo.com", passHash: sha("Owner123"), role:"owner", createdAt:new Date().toISOString() },
      { id: driverId, name:"Delivery Driver", email:"driver@demo.com", passHash: sha("Driver123"), role:"driver", createdAt:new Date().toISOString() },
      { id: customerId, name:"Demo Customer", email:"user@demo.com", passHash: sha("User123"), role:"customer", createdAt:new Date().toISOString() },
    ],
    restaurants: [],
    products: [],
    orders: []
  };

  // Demo "real" images as URLs (can be replaced by Base64 via upload)
  // Note: These require internet. You can upload images to store as Base64 for offline use.
  const imgs = {
    burger: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=70",
    pizza: "https://images.unsplash.com/photo-1548365328-9f547f6bcefa?auto=format&fit=crop&w=800&q=70",
    shawarma: "https://images.unsplash.com/photo-1604908554027-5a40c6b6c1fa?auto=format&fit=crop&w=800&q=70",
    dessert: "https://images.unsplash.com/photo-1518131672697-613becd4fab5?auto=format&fit=crop&w=800&q=70",
    fries: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=70",
    kunafa: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=70",
    coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=70",
  };

  const r1 = { id: uuid("r"), name:"بيت البرغر", category:"برغر", city:"الدار البيضاء", address:"شارع المثال 12", phone:"06xxxxxxxx",
    ownerId, etaMin:25, rating:4.7, tags:["الأكثر طلباً","برغر","بطاطس"], cover: imgs.burger };
  const r2 = { id: uuid("r"), name:"بيتزا نابولي", category:"بيتزا", city:"الرباط", address:"زنقة تجريبية 3", phone:"06xxxxxxxx",
    ownerId, etaMin:35, rating:4.6, tags:["بيتزا","جبن","فرن"], cover: imgs.pizza };
  const r3 = { id: uuid("r"), name:"شاورما الشام", category:"شاورما", city:"مراكش", address:"حي السلام 9", phone:"06xxxxxxxx",
    ownerId, etaMin:20, rating:4.8, tags:["سريع","شاورما","صوص ثوم"], cover: imgs.shawarma };
  const r4 = { id: uuid("r"), name:"حلويات السلطان", category:"حلويات", city:"طنجة", address:"طريق المدينة 1", phone:"06xxxxxxxx",
    ownerId, etaMin:40, rating:4.5, tags:["حلويات","بقلاوة","قهوة"], cover: imgs.dessert };

  db.restaurants.push(r1,r2,r3,r4);

  const products = [
    {restId:r1.id, name:"برغر كلاسيك", desc:"لحم طازج + جبن + صوص خاص", price:45.00, image: imgs.burger},
    {restId:r1.id, name:"برغر دبل", desc:"قطعتين لحم + جبن + مخلل", price:62.00, image: imgs.burger},
    {restId:r1.id, name:"بطاطس كرسبي", desc:"مقرمشة مع بهارات", price:18.00, image: imgs.fries},

    {restId:r2.id, name:"بيتزا مارجريتا", desc:"صلصة طماطم + جبن موزاريلا", price:55.00, image: imgs.pizza},
    {restId:r2.id, name:"بيتزا بيبروني", desc:"بيبروني + جبن + زيتون", price:69.00, image: imgs.pizza},
    {restId:r2.id, name:"كالزوني", desc:"بيتزا مطوية بحشوة لذيذة", price:63.00, image: imgs.pizza},

    {restId:r3.id, name:"شاورما دجاج", desc:"دجاج متبل + ثوم + مخلل", price:32.00, image: imgs.shawarma},
    {restId:r3.id, name:"شاورما لحم", desc:"لحم + طحينة + خضار", price:38.00, image: imgs.shawarma},
    {restId:r3.id, name:"صحن شاورما", desc:"شاورما + بطاطس + سلطات", price:58.00, image: imgs.shawarma},

    {restId:r4.id, name:"بقلاوة مشكلة", desc:"مزيج بقلاوة مع فستق", price:48.00, image: imgs.dessert},
    {restId:r4.id, name:"كنافة", desc:"كنافة بالجبن وقطر", price:42.00, image: imgs.kunafa},
    {restId:r4.id, name:"قهوة عربية", desc:"قهوة عربية مع هيل", price:14.00, image: imgs.coffee},
  ].map(p => ({
    id: uuid("p"),
    restId: p.restId,
    name: p.name,
    desc: p.desc,
    price: p.price,
    image: p.image || "",
    available: true,
    createdAt: new Date().toISOString()
  }));

  db.products.push(...products);

  setDB(db);
  return db;
}

/* Session */
export function getSession(){
  const raw = localStorage.getItem(SESSION_KEY);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}
export function setSession(sess){
  localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
}
export function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}
export function currentUser(db){
  const sess = getSession();
  if(!sess?.userId) return null;
  return db.users.find(u => u.id === sess.userId) || null;
}

/* Auth Guards */
export function requireAuth(redirectTo="login.html"){
  const db = ensureSeed();
  const u = currentUser(db);
  if(!u){
    const here = location.pathname.split("/").pop() || "index.html";
    location.href = `${redirectTo}?next=${encodeURIComponent(here + location.search)}`;
    return null;
  }
  return u;
}
export function requireRole(role){
  const db = ensureSeed();
  const u = currentUser(db);
  if(!u) return null;
  if(u.role !== role){
    location.href = "index.html";
    return null;
  }
  return u;
}

/* Cart per user */
export function cartKey(userId){ return `FW_CART_V2_${userId}`; }
export function getCart(userId){
  const raw = localStorage.getItem(cartKey(userId));
  if(!raw) return {};
  try{ return JSON.parse(raw) || {}; }catch(e){ return {}; }
}
export function setCart(userId, cart){
  localStorage.setItem(cartKey(userId), JSON.stringify(cart || {}));
}
export function clearCart(userId){
  localStorage.removeItem(cartKey(userId));
}

/* simple hash */
export function sha(str){
  let h = 0;
  for(let i=0;i<str.length;i++){ h = (h<<5) - h + str.charCodeAt(i); h |= 0; }
  return "h" + (h >>> 0).toString(16);
}
