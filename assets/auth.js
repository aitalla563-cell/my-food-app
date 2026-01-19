import { ensureSeed, getDB, setDB, setSession, clearSession, sha } from "./db.js";
import { showToast } from "./util.js";

export function login(email, password){
  const db = ensureSeed();
  const e = String(email||"").trim().toLowerCase();
  const p = String(password||"");
  const u = db.users.find(x => x.email.toLowerCase() === e);
  if(!u) return { ok:false, msg:"الحساب غير موجود" };
  if(u.passHash !== sha(p)) return { ok:false, msg:"كلمة المرور غير صحيحة" };
  setSession({ userId: u.id, at: new Date().toISOString() });
  return { ok:true, user:u };
}

export function logout(){
  clearSession();
  showToast("تم تسجيل الخروج");
}

export function registerCustomer({name,email,password}){
  const db = ensureSeed();
  const e = String(email||"").trim().toLowerCase();
  if(!e || !password || !name) return { ok:false, msg:"أكمل البيانات" };
  if(db.users.some(u=> u.email.toLowerCase() === e)) return { ok:false, msg:"الإيميل مسجل مسبقاً" };

  const id = crypto.randomUUID ? crypto.randomUUID() : ("u-" + Math.random().toString(16).slice(2));
  db.users.push({
    id,
    name: String(name).trim(),
    email: e,
    passHash: sha(String(password)),
    role: "customer",
    createdAt: new Date().toISOString()
  });
  setDB(db);
  setSession({ userId: id, at: new Date().toISOString() });
  return { ok:true };
}
