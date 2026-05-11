// Vyroba cenoviek - main app logic
"use strict";

const APP_VERSION = "1.0";
const STORAGE_KEY = "vyroba_cenoviek_data_v1";
const AUTOSAVE_DELAY_MS = 600;

const CATEGORIES = [
  "Cookies", "Koláče - klasické", "Koláče - vegánske", "Koláče - bezlepkové",
  "Cheesecake", "Bagely", "Croissanty", "Praclík", "Nápoje", "Káva a príslušenstvo",
];

const DEFAULT_WEIGHT = "80 g";
const DEFAULT_PRICE = "3,90 €";

// ============= STATE =============
const state = {
  products: [],          // array of product objects
  selectedIndex: -1,     // currently edited product
  search: "",
  filterCategory: "__all__",
  saveTimer: null,
  loadedFromStorage: false,
};

// ============= AUTO-FORMAT =============
function formatWeight(s) {
  // Accepts both weight (g, kg, ks) and volume (ml, l, dl, cl) units
  if (!s) return s;
  s = s.trim();
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(kg|ml|dl|cl|g|l|ks)$/i);
  if (m) return `${m[1]} ${m[2].toLowerCase()}`;
  return s;
}

function isDrinkCategory(p) {
  return (p && p.category) === "Nápoje";
}

function weightFieldLabel(p) {
  return isDrinkCategory(p) ? "Objem" : "Hmotnosť";
}

function formatPrice(s) {
  if (!s) return s;
  s = s.trim().replace(/EUR/gi, "€").replace(/\./g, ",");
  const m = s.match(/^(\d+)(?:,(\d+))?\s*€?\s*$/);
  if (m) {
    const whole = m[1];
    let frac = m[2] || "";
    if (!frac) frac = "00";
    else if (frac.length === 1) frac = frac + "0";
    return `${whole},${frac} €`;
  }
  return s;
}

function formatAlergeny(s) {
  if (!s) return s;
  const nums = s.match(/\d+/g);
  if (nums) return nums.join(", ");
  return s.trim();
}

function formatTrvanlivost(s) {
  if (!s) return s;
  s = s.trim();
  let m = s.match(/^(\d+)\s*dn[ií]?$/i);
  if (m) return `${m[1]} dní`;
  m = s.match(/^(\d+)\s*h$/i);
  if (m) return `${m[1]}h`;
  return s;
}

function validateProduct(p) {
  const issues = [];
  if (!(p.name || "").trim()) issues.push("chýba názov");
  if (!(p.ingredients || "").trim()) issues.push("chýba zloženie");
  else if ((p.ingredients || "").toLowerCase().includes("[doplnit")) issues.push("zloženie obsahuje placeholder");
  // Require at least Cena BA (Mimo BA is optional)
  if (!(p.price_ba || "").trim()) issues.push("chýba cena BA");
  if (!(p.weight || "").trim()) issues.push(isDrinkCategory(p) ? "chýba objem" : "chýba hmotnosť");
  if (!(p.alergeny || "").trim()) issues.push("chýbajú alergény");
  return issues;
}

// Migrate old products that only have `price` to new schema with price_ba/price_mimo_ba
function migrateProductSchema(products) {
  for (const p of products) {
    if (p.price && !p.price_ba) {
      p.price_ba = p.price;
      delete p.price;
    }
    if (!p.price_mimo_ba) p.price_mimo_ba = "";
  }
  return products;
}

// ============= STORAGE =============
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
    return true;
  } catch (e) {
    showToast("Chyba ukladania: " + e.message, "error");
    return false;
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        state.products = migrateProductSchema(data);
        state.loadedFromStorage = true;
        return true;
      }
    }
  } catch (e) {
    console.warn("Storage load failed:", e);
  }
  return false;
}

async function loadFromJsonFile() {
  // Tries fetch — works when served via http://, fails on file://
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("fetch status " + r.status);
    const data = await r.json();
    if (Array.isArray(data)) {
      state.products = migrateProductSchema(data);
      return true;
    }
  } catch (e) {
    console.info("Could not fetch data.json (probably opened via file://):", e.message);
  }
  return false;
}

// ============= STATUS INDICATOR =============
const statusEl = document.getElementById("statusIndicator");
let statusTimer = null;

function setStatusSaving() {
  clearTimeout(statusTimer); // prevent leftover fade-out from previous "saved" state
  statusEl.textContent = "● Ukladám...";
  statusEl.className = "status-indicator saving";
}
function setStatusSaved() {
  statusEl.textContent = "✓ Uložené";
  statusEl.className = "status-indicator saved";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusEl.textContent = ""; statusEl.className = "status-indicator"; }, 1500);
}
function setStatusError(msg) {
  statusEl.textContent = "✗ " + (msg || "Chyba ukladania");
  statusEl.className = "status-indicator err";
}

// ============= TOAST =============
function showToast(msg, kind = "") {
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ============= AUTOSAVE =============
function scheduleAutosave() {
  setStatusSaving();
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    if (saveToStorage()) setStatusSaved();
    else setStatusError();
  }, AUTOSAVE_DELAY_MS);
}

// ============= RENDERING =============
function renderHeader() {
  document.getElementById("hdrVersion").textContent = "v" + APP_VERSION;
  document.title = `Výroba cenoviek v${APP_VERSION}`;
}

function renderCategoryFilter() {
  const sel = document.getElementById("categoryFilter");
  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "__all__";
  optAll.textContent = "Všetky kategórie";
  sel.appendChild(optAll);
  for (const cat of CATEGORIES) {
    const o = document.createElement("option");
    o.value = cat;
    o.textContent = cat;
    sel.appendChild(o);
  }
  sel.value = state.filterCategory;
}

function renderCategorySelect() {
  const sel = document.getElementById("fldCategory");
  sel.innerHTML = "";
  for (const cat of CATEGORIES) {
    const o = document.createElement("option");
    o.value = cat;
    o.textContent = cat;
    sel.appendChild(o);
  }
}

function stripDiacritics(s) {
  // "Koláč" → "Kolac" — strip Unicode combining marks (U+0300..U+036F)
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getFilteredProducts() {
  const q = stripDiacritics(state.search.trim().toLowerCase());
  const cat = state.filterCategory;
  const indexed = state.products.map((p, i) => ({ p, originalIdx: i }));
  return indexed.filter(({ p }) => {
    if (cat !== "__all__" && (p.category || "Cookies") !== cat) return false;
    if (!q) return true;
    const haystack = stripDiacritics([
      p.name, p.subtitle, p.ingredients, p.alergeny, p.category, p.weight, p.price_ba, p.price_mimo_ba,
    ].filter(Boolean).join(" ").toLowerCase());
    return haystack.includes(q);
  });
}

function renderProductList() {
  const list = document.getElementById("productList");
  const filtered = getFilteredProducts();
  list.innerHTML = "";

  document.getElementById("countLabel").textContent = `(${filtered.length}/${state.products.length})`;

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-empty";
    empty.textContent = state.products.length === 0
      ? 'Zatiaľ žiadne produkty.\nKlikni „+ Nový produkt".'
      : "Žiadne výsledky pre tento filter.";
    list.appendChild(empty);
    return;
  }

  // Group by category
  const grouped = new Map();
  for (const item of filtered) {
    const cat = item.p.category || "Cookies";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(item);
  }
  // Render in CATEGORIES order
  const orderedCats = CATEGORIES.filter(c => grouped.has(c));
  // Plus any custom categories not in the list
  for (const c of grouped.keys()) {
    if (!orderedCats.includes(c)) orderedCats.push(c);
  }

  for (const cat of orderedCats) {
    const header = document.createElement("div");
    header.className = "list-cat";
    header.textContent = cat;
    list.appendChild(header);

    for (const { p, originalIdx } of grouped.get(cat)) {
      const row = document.createElement("div");
      row.className = "list-item" + (originalIdx === state.selectedIndex ? " active" : "");
      row.dataset.idx = originalIdx;

      const issues = validateProduct(p);

      const info = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "list-item-name";
      nm.textContent = p.name || "(bez názvu)";
      const sub = document.createElement("div");
      sub.className = "list-item-sub";
      sub.textContent = [p.subtitle, p.weight, p.price_ba].filter(Boolean).join(" • ");
      info.appendChild(nm);
      if (sub.textContent) info.appendChild(sub);
      row.appendChild(info);

      if (issues.length > 0) {
        const w = document.createElement("span");
        w.className = "list-item-warn";
        w.textContent = "⚠";
        w.title = issues.join(", ");
        row.appendChild(w);
      }

      row.addEventListener("click", () => selectProduct(originalIdx));
      list.appendChild(row);
    }
  }
}

function renderForm() {
  const empty = document.getElementById("formEmpty");
  const content = document.getElementById("formContent");
  if (state.selectedIndex < 0 || state.selectedIndex >= state.products.length) {
    empty.hidden = false;
    content.hidden = true;
    return;
  }
  empty.hidden = true;
  content.hidden = false;

  const p = state.products[state.selectedIndex];
  document.getElementById("formProductName").textContent = p.name || "(bez názvu)";
  document.getElementById("fldCategory").value = p.category || "Cookies";
  document.getElementById("lblWeight").textContent = weightFieldLabel(p);
  document.getElementById("fldName").value = p.name || "";
  document.getElementById("fldSubtitle").value = p.subtitle || "";
  document.getElementById("fldWeight").value = p.weight || "";
  document.getElementById("fldPriceBa").value = p.price_ba || "";
  document.getElementById("fldPriceMimo").value = p.price_mimo_ba || "";
  document.getElementById("fldIngredients").value = p.ingredients || "";
  document.getElementById("fldAlergeny").value = p.alergeny || "";
  document.getElementById("fldTrvanlivost").value = p.trvanlivost || "";
  document.getElementById("fldVyrobca").value = p.vyrobca || "";

  renderValidation();
}

function renderValidation() {
  const msg = document.getElementById("validationMsg");
  if (state.selectedIndex < 0) { msg.textContent = ""; return; }
  const issues = validateProduct(state.products[state.selectedIndex]);
  if (issues.length === 0) {
    msg.textContent = "✓ Všetky polia vyplnené správne";
    msg.className = "validation-msg ok";
  } else {
    msg.textContent = "⚠ " + issues.join(", ");
    msg.className = "validation-msg";
  }
}

function renderFooterInfo() {
  const info = document.getElementById("footerInfo");
  info.textContent = `${state.products.length} produktov • dáta v prehliadači (localStorage)`;
}

function rerenderAll() {
  renderProductList();
  renderForm();
  renderFooterInfo();
}

// ============= ACTIONS =============
function selectProduct(idx) {
  state.selectedIndex = idx;
  rerenderAll();
}

function addProduct() {
  const cat = state.filterCategory !== "__all__" ? state.filterCategory : "Cookies";
  const newProd = {
    category: cat,
    name: "",
    subtitle: "",
    weight: "",
    price_ba: "",
    price_mimo_ba: "",
    ingredients: "",
    alergeny: "",
    vyrobca: "",
    trvanlivost: "",
  };
  state.products.push(newProd);
  state.selectedIndex = state.products.length - 1;
  scheduleAutosave();
  rerenderAll();
  document.getElementById("fldName").focus();
}

function duplicateProduct() {
  if (state.selectedIndex < 0) return;
  const orig = state.products[state.selectedIndex];
  const copy = JSON.parse(JSON.stringify(orig));
  copy.subtitle = (copy.subtitle || copy.name) + " (kópia)";
  state.products.splice(state.selectedIndex + 1, 0, copy);
  state.selectedIndex += 1;
  scheduleAutosave();
  rerenderAll();
  showToast("Produkt zduplikovaný", "success");
}

function deleteProduct() {
  if (state.selectedIndex < 0) return;
  const p = state.products[state.selectedIndex];
  const label = [p.name, p.subtitle].filter(Boolean).join(" — ");
  if (!confirm(`Naozaj vymazať produkt:\n\n${label}\n\nTáto akcia sa nedá vrátiť.`)) return;
  state.products.splice(state.selectedIndex, 1);
  if (state.selectedIndex >= state.products.length) state.selectedIndex = state.products.length - 1;
  scheduleAutosave();
  rerenderAll();
  showToast("Produkt vymazaný");
}

function updateField(field, rawValue, formatFn) {
  if (state.selectedIndex < 0) return;
  const p = state.products[state.selectedIndex];
  p[field] = rawValue;
  scheduleAutosave();
  // Live update name in header & list
  if (field === "name" || field === "subtitle") {
    document.getElementById("formProductName").textContent = p.name || "(bez názvu)";
  }
  // Live update weight/volume label when category changes
  if (field === "category") {
    document.getElementById("lblWeight").textContent = weightFieldLabel(p);
  }
  // Defer list re-render to avoid flicker; do it on blur for fields that change list display
}

// ============= IMPORT / EXPORT =============
function exportJson() {
  const blob = new Blob([JSON.stringify(state.products, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `produkty_doris_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Dáta exportované", "success");
}

function importJsonFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error("Súbor nie je zoznam produktov");
      if (!confirm(`Importovať ${data.length} produktov? Aktuálne dáta (${state.products.length}) budú prepísané.`)) return;
      state.products = data;
      state.selectedIndex = -1;
      saveToStorage();
      rerenderAll();
      showToast(`Importovaných ${data.length} produktov`, "success");
    } catch (err) {
      showToast("Chyba importu: " + err.message, "error");
    }
  };
  reader.readAsText(file, "utf-8");
}

// ============= EVENT WIRING =============
function wireEvents() {
  // Search
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderProductList();
  });

  // Category filter
  document.getElementById("categoryFilter").addEventListener("change", (e) => {
    state.filterCategory = e.target.value;
    renderProductList();
  });

  // Add / duplicate / delete
  document.getElementById("btnAdd").addEventListener("click", addProduct);
  document.getElementById("btnDuplicate").addEventListener("click", duplicateProduct);
  document.getElementById("btnDelete").addEventListener("click", deleteProduct);

  // Form fields
  const fields = [
    { id: "fldCategory", key: "category", refresh: true },
    { id: "fldName", key: "name", refresh: true },
    { id: "fldSubtitle", key: "subtitle", refresh: true },
    { id: "fldWeight", key: "weight", format: formatWeight, refresh: true },
    { id: "fldPriceBa", key: "price_ba", format: formatPrice, refresh: true },
    { id: "fldPriceMimo", key: "price_mimo_ba", format: formatPrice, refresh: true },
    { id: "fldIngredients", key: "ingredients", refresh: false },
    { id: "fldAlergeny", key: "alergeny", format: formatAlergeny, refresh: false },
    { id: "fldTrvanlivost", key: "trvanlivost", format: formatTrvanlivost, refresh: false },
    { id: "fldVyrobca", key: "vyrobca", refresh: false },
  ];

  for (const f of fields) {
    const el = document.getElementById(f.id);
    el.addEventListener("input", (e) => {
      updateField(f.key, e.target.value);
      renderValidation();
    });
    el.addEventListener("blur", (e) => {
      if (f.format) {
        const formatted = f.format(e.target.value);
        if (formatted !== e.target.value) {
          e.target.value = formatted;
          updateField(f.key, formatted);
        }
      }
      if (f.refresh) renderProductList();
      renderValidation();
    });
    // Selects: refresh list immediately on change (blur is unreliable)
    if (el.tagName === "SELECT" && f.refresh) {
      el.addEventListener("change", () => renderProductList());
    }
  }

  // PDF button
  document.getElementById("btnPdf").addEventListener("click", openPdfModal);

  // Modal
  document.getElementById("btnModalClose").addEventListener("click", closePdfModal);
  document.getElementById("btnModalCancel").addEventListener("click", closePdfModal);
  document.getElementById("modalBackdrop").addEventListener("click", closePdfModal);
  document.getElementById("btnSelectAll").addEventListener("click", () => modalToggleAll(true));
  document.getElementById("btnSelectNone").addEventListener("click", () => modalToggleAll(false));
  document.getElementById("btnModalGenerate").addEventListener("click", generatePdfFromModal);
  document.getElementById("btnModalPrint").addEventListener("click", printDirectFromModal);

  // Price tier toggle (BA vs Mimo BA)
  document.querySelectorAll(".price-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modalState.priceTier = btn.dataset.tier;
      document.querySelectorAll(".price-btn").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  // Import / Export
  document.getElementById("btnExport").addEventListener("click", exportJson);
  document.getElementById("btnImport").addEventListener("click", () => document.getElementById("fileInput").click());
  document.getElementById("fileInput").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) importJsonFromFile(f);
    e.target.value = ""; // reset
  });

  // Keyboard: Esc closes modal; Ctrl/Cmd+N adds new
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePdfModal();
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      addProduct();
    }
  });
}

// ============= MODAL (PDF SELECTION) =============
const modalState = {
  selectedIds: new Set(),
  priceTier: "ba", // "ba" or "mimo"
};

function openPdfModal() {
  // Pre-select valid products
  modalState.selectedIds.clear();
  state.products.forEach((p, i) => {
    if (validateProduct(p).length === 0) modalState.selectedIds.add(i);
  });
  renderModal();
  const el = document.getElementById("pdfModal");
  el.hidden = false;
  el.style.display = ""; // clear any inline style so .modal CSS rule applies
}

function closePdfModal() {
  const el = document.getElementById("pdfModal");
  el.hidden = true;
  el.style.display = "none"; // belt-and-suspenders even if CSS [hidden] override isn't loaded
}

function modalToggleAll(selected) {
  modalState.selectedIds.clear();
  if (selected) {
    state.products.forEach((_, i) => modalState.selectedIds.add(i));
  }
  renderModal();
}

function renderModal() {
  const body = document.getElementById("modalBody");
  body.innerHTML = "";

  // Group by category
  const grouped = new Map();
  state.products.forEach((p, i) => {
    const cat = p.category || "Cookies";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push({ p, idx: i });
  });
  const orderedCats = CATEGORIES.filter(c => grouped.has(c));
  for (const c of grouped.keys()) {
    if (!orderedCats.includes(c)) orderedCats.push(c);
  }

  for (const cat of orderedCats) {
    const h = document.createElement("div");
    h.className = "modal-cat";
    h.textContent = cat;
    body.appendChild(h);

    for (const { p, idx } of grouped.get(cat)) {
      const row = document.createElement("label");
      row.className = "modal-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = modalState.selectedIds.has(idx);
      cb.addEventListener("change", () => {
        if (cb.checked) modalState.selectedIds.add(idx);
        else modalState.selectedIds.delete(idx);
        updateModalCount();
      });
      row.appendChild(cb);

      const txt = document.createElement("span");
      const nm = document.createElement("span");
      nm.className = "modal-item-name";
      nm.textContent = p.name || "(bez názvu)";
      txt.appendChild(nm);

      if (p.subtitle) {
        const s = document.createElement("span");
        s.className = "modal-item-sub";
        s.textContent = "— " + p.subtitle;
        txt.appendChild(s);
      }
      row.appendChild(txt);

      const issues = validateProduct(p);
      if (issues.length > 0) {
        const w = document.createElement("span");
        w.className = "modal-item-warn";
        w.textContent = "⚠";
        w.title = issues.join(", ");
        row.appendChild(w);
      }

      body.appendChild(row);
    }
  }
  updateModalCount();
}

function updateModalCount() {
  const n = modalState.selectedIds.size;
  document.getElementById("modalCount").textContent = `${n} vybraných`;
}

async function generatePdfFromModal() {
  if (modalState.selectedIds.size === 0) {
    showToast("Vyber aspoň jeden produkt", "error");
    return;
  }
  // Check for invalid products
  const selected = [...modalState.selectedIds].map(i => state.products[i]);
  const invalid = selected.filter(p => validateProduct(p).length > 0);
  if (invalid.length > 0) {
    const names = invalid.slice(0, 3).map(p => `• ${p.name || "(bez názvu)"}: ${validateProduct(p).join(", ")}`).join("\n");
    const more = invalid.length > 3 ? `\n... a ďalších ${invalid.length - 3}` : "";
    if (!confirm(`Niektoré produkty majú chyby:\n\n${names}${more}\n\nVygenerovať aj tak?`)) return;
  }

  closePdfModal();

  closePdfModal();
  const priceField = modalState.priceTier === "mimo" ? "price_mimo_ba" : "price_ba";
  showToast(`Generujem PDF (${modalState.priceTier === "mimo" ? "Mimo BA" : "BA"} cena)...`);
  try {
    await generateCenovkyPdf(selected, priceField);
    showToast("PDF vygenerované", "success");
  } catch (e) {
    console.error(e);
    showToast("Chyba: " + e.message, "error");
  }
}

async function printDirectFromModal() {
  if (modalState.selectedIds.size === 0) {
    showToast("Vyber aspoň jeden produkt", "error");
    return;
  }
  const selected = [...modalState.selectedIds].map(i => state.products[i]);
  const invalid = selected.filter(p => validateProduct(p).length > 0);
  if (invalid.length > 0) {
    const names = invalid.slice(0, 3).map(p => `• ${p.name || "(bez názvu)"}: ${validateProduct(p).join(", ")}`).join("\n");
    const more = invalid.length > 3 ? `\n... a ďalších ${invalid.length - 3}` : "";
    if (!confirm(`Niektoré produkty majú chyby:\n\n${names}${more}\n\nPokračovať s tlačou?`)) return;
  }

  closePdfModal();
  const priceField = modalState.priceTier === "mimo" ? "price_mimo_ba" : "price_ba";
  showToast(`Pripravujem tlač (${modalState.priceTier === "mimo" ? "Mimo BA" : "BA"} cena)...`);
  try {
    await printCenovkyDirect(selected, priceField);
    showToast("Okno tlače otvorené", "success");
  } catch (e) {
    console.error(e);
    showToast("Chyba: " + e.message, "error");
  }
}

// ============= INIT =============
async function init() {
  renderHeader();
  renderCategoryFilter();
  renderCategorySelect();

  if (!loadFromStorage()) {
    await loadFromJsonFile();
  }

  wireEvents();
  rerenderAll();
}

document.addEventListener("DOMContentLoaded", init);
