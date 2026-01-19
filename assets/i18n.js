const LANG_KEY = "FW_LANG_V1";

const dict = {
  ar: {
    brand: "منصة طلب الطعام",
    home: "الرئيسية",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    customerApp: "واجهة الزبون",
    admin: "لوحة التحكم",
    owner: "لوحة المالك",
    driver: "لوحة المندوب",
    logout: "خروج",
    search: "ابحث عن مطعم أو وجبة...",
    allCats: "كل التصنيفات",
    clearFilters: "مسح الفلاتر",
    cart: "السلة",
    myOrders: "طلباتي",
    checkout: "إتمام الطلب",
    restaurantsAndMeals: "المطاعم والوجبات",
    cartTitle: "سلة المشتريات",
    couponPlaceholder: "كود خصم (SAVE10 / LESS20)",
    apply: "تطبيق",
    clear: "تفريغ",
    print: "طباعة",
    confirm: "تأكيد",
    orderStatus: "حالة الطلب",
    assignedDriver: "المندوب",
    assign: "إسناد",
    orders: "الطلبات",
    status: "الحالة",
    total: "الإجمالي"
  },
  en: {
    brand: "Food Ordering Platform",
    home: "Home",
    login: "Login",
    register: "Sign up",
    customerApp: "Customer App",
    admin: "Admin Panel",
    owner: "Owner Panel",
    driver: "Driver Panel",
    logout: "Logout",
    search: "Search restaurant or meal...",
    allCats: "All categories",
    clearFilters: "Clear filters",
    cart: "Cart",
    myOrders: "My Orders",
    checkout: "Checkout",
    restaurantsAndMeals: "Restaurants & Meals",
    cartTitle: "Cart",
    couponPlaceholder: "Coupon (SAVE10 / LESS20)",
    apply: "Apply",
    clear: "Clear",
    print: "Print",
    confirm: "Confirm",
    orderStatus: "Order status",
    assignedDriver: "Driver",
    assign: "Assign",
    orders: "Orders",
    status: "Status",
    total: "Total"
  }
};

export function getLang(){
  const l = localStorage.getItem(LANG_KEY) || "ar";
  return (l === "en") ? "en" : "ar";
}

export function setLang(lang){
  localStorage.setItem(LANG_KEY, (lang === "en") ? "en" : "ar");
}

export function t(key){
  const lang = getLang();
  return (dict[lang] && dict[lang][key]) ? dict[lang][key] : key;
}

export function applyI18n(root=document){
  const lang = getLang();
  root.documentElement?.setAttribute?.("lang", lang);
  root.documentElement?.setAttribute?.("dir", lang === "en" ? "ltr" : "rtl");

  root.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  root.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    const key = el.getAttribute("data-i18n-ph");
    el.setAttribute("placeholder", t(key));
  });

  const langSel = root.getElementById("langSelect");
  if(langSel){
    langSel.value = lang;
    langSel.onchange = ()=>{
      setLang(langSel.value);
      location.reload();
    };
  }
}
