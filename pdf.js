// Vyroba cenoviek - PDF generator (Canvas + jsPDF)
// 3 cenovky 12x7 cm na A4 portrait, centrovane.
"use strict";

const PDF_DPI = 300;
const PAGE_W = 2481;   // A4 width at 300 DPI (210 mm)
const PAGE_H = 3508;   // A4 height at 300 DPI (297 mm)

// Each cenovka: target 12 cm x 7.5 cm after print
// Printer shrinks vertically ~12.6%:
//   Width:  design 125.2 mm prints as ~12 cm
//   Height: 75 mm × 1.126 = 84.5 mm design → prints as 7.5 cm
const CARD_W = 1479;   // 125.2 mm — prints as 120 mm
const CARD_H = 998;    // 84.5 mm — prints as 75 mm

// Center cards horizontally on A4
const CARD_X = Math.round((PAGE_W - CARD_W) / 2);  // ~532 px

// Stack 3 cards vertically with even spacing
// Available vertical margin: 3508 - 3*827 = 1027 px split into 4 spaces
const VMARGIN = Math.round((PAGE_H - 3 * CARD_H) / 4);  // ~257 px
const CARD_OFFSETS_Y = [
  VMARGIN,
  VMARGIN + CARD_H + VMARGIN,
  VMARGIN + 2 * (CARD_H + VMARGIN),
];

// Card content positions (Y, relative to card top — card is 998 px tall)
// Scaled proportionally by 1.073 from previous 930 px card height.
const CARD_POS = {
  brand: 104,          // big product name
  subtitle: 289,       // subtitle / flavor
  price: 474,          // price
  zlozenie_label: 589, // ingredients label
  body: 630,           // ingredients body text
  details: 589,        // details (right column)
};

// X positions (relative to card left — card is 1479 px wide)
// paper_bg has TWO separate black lines (LEFT for Zlozenie, RIGHT for Details):
//   LEFT line:  x=118..546 (width 428)
//   RIGHT line: x=940..1361 (width 421)
//   Gap between (price area): x=546..940
// Columns align EXACTLY under their respective lines.
const COL_LEFT_X = 120;    // Zlozenie under LEFT line
const COL_LEFT_W = 425;    // ends at 545 (line LEFT right edge)
const COL_RIGHT_X = 942;   // Details under RIGHT line (left edge)
const COL_RIGHT_W = 419;   // ends at 1361 (line RIGHT right edge)

// Max widths for centered title/subtitle (within card)
const TITLE_MAX_W = 1300;     // leaves ~58 px margin each side inside card
const SUBTITLE_MAX_W = 1250;

// Font sizes in pt (converted to px via *DPI/72)
const FS = {
  brand: 40,
  name: 20,
  price: 20,
  zlozenie_label: 8,
  ingredients: 6,
  details_label: 6,   // same size as Zlozenie body ingredients
  details_value: 6,
};

const TABAC = "Tabac Sans";

function ptToPx(pt) {
  return Math.round(pt * PDF_DPI / 72);
}

function setFont(ctx, weight, style, sizePt) {
  ctx.font = `${style} ${weight} ${ptToPx(sizePt)}px "${TABAC}"`;
  ctx.textBaseline = "top";
}

function fitFontSize(ctx, text, weight, style, maxSizePt, minSizePt, maxWidth) {
  if (!text) return maxSizePt;
  for (let sz = maxSizePt; sz >= minSizePt; sz -= 1) {
    setFont(ctx, weight, style, sz);
    if (ctx.measureText(text).width <= maxWidth) return sz;
  }
  return minSizePt;
}

function fitTextInBox(ctx, text, weight, style, maxSizePt, minSizePt, maxWidth, maxHeight) {
  if (!text) return { size: maxSizePt, lines: [], lineH: Math.round(ptToPx(maxSizePt) * 1.1) };
  for (let sz = maxSizePt; sz >= minSizePt; sz -= 1) {
    setFont(ctx, weight, style, sz);
    const lines = wrapText(ctx, text, maxWidth);
    const lineH = Math.round(ptToPx(sz) * 1.1);
    if (lines.length * lineH <= maxHeight) {
      return { size: sz, lines, lineH };
    }
  }
  setFont(ctx, weight, style, minSizePt);
  const lines = wrapText(ctx, text, maxWidth);
  return { size: minSizePt, lines, lineH: Math.round(ptToPx(minSizePt) * 1.1) };
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// PDF labels in two languages
const PDF_LABELS = {
  sk: {
    zlozenie: "Zloženie:",
    hmotnost: "Hmotnosť:",
    objem: "Objem:",
    alergeny: "Alergény:",
    vyrobca: "Výrobca:",
    trvanlivost: "Trvanlivosť:",
  },
  cz: {
    zlozenie: "Složení:",
    hmotnost: "Hmotnost:",
    objem: "Objem:",
    alergeny: "Alergeny:",
    vyrobca: "Výrobce:",
    trvanlivost: "Trvanlivost:",
  },
};

function drawCard(ctx, prod, cardX, cardY, priceField, lang) {
  const cx = cardX + CARD_W / 2;
  ctx.fillStyle = "#000000";
  priceField = priceField || "price_ba";
  lang = (lang === "cz") ? "cz" : "sk";
  const L = PDF_LABELS[lang];

  const TITLE_BOX_H = CARD_POS.subtitle - CARD_POS.brand - 10;
  const SUBTITLE_BOX_H = CARD_POS.price - CARD_POS.subtitle - 10;

  // Title (brand)
  const title = prod.name || "Doris Cookies";
  const titleFit = fitTextInBox(ctx, title, "bold", "italic", FS.brand, 14, TITLE_MAX_W, TITLE_BOX_H);
  setFont(ctx, "bold", "italic", titleFit.size);
  let ty = cardY + CARD_POS.brand;
  for (const ln of titleFit.lines) {
    const w = ctx.measureText(ln).width;
    ctx.fillText(ln, cx - w / 2, ty);
    ty += titleFit.lineH;
  }

  // Subtitle
  if (prod.subtitle) {
    const subFit = fitTextInBox(ctx, prod.subtitle, "bold", "italic", FS.name, 9, SUBTITLE_MAX_W, SUBTITLE_BOX_H);
    setFont(ctx, "bold", "italic", subFit.size);
    let sy = cardY + CARD_POS.subtitle;
    for (const ln of subFit.lines) {
      const w = ctx.measureText(ln).width;
      ctx.fillText(ln, cx - w / 2, sy);
      sy += subFit.lineH;
    }
  }

  // Price (BA or Mimo BA based on priceField)
  setFont(ctx, "normal", "normal", FS.price);
  const priceTxt = prod[priceField] || prod.price_ba || prod.price || "";
  const priceW = ctx.measureText(priceTxt).width;
  ctx.fillText(priceTxt, cx - priceW / 2, cardY + CARD_POS.price);

  // Left column: ingredients
  setFont(ctx, "bold", "normal", FS.zlozenie_label);
  ctx.fillText(L.zlozenie, cardX + COL_LEFT_X, cardY + CARD_POS.zlozenie_label);

  setFont(ctx, "normal", "normal", FS.ingredients);
  const bodyLh = Math.round(ptToPx(FS.ingredients) * 1.30);
  let by = cardY + CARD_POS.body;
  const ingLines = wrapText(ctx, prod.ingredients || "", COL_LEFT_W);
  for (const ln of ingLines) {
    ctx.fillText(ln, cardX + COL_LEFT_X, by);
    by += bodyLh;
  }

  // Right column: details
  const isDrink = (prod.category || "") === "Nápoje";
  const weightLabel = isDrink ? L.objem : L.hmotnost;
  const detLh = Math.round(ptToPx(FS.details_value) * 1.45);
  const details = [
    [weightLabel, prod.weight || ""],
    [L.alergeny, prod.alergeny || ""],
    [L.vyrobca, prod.vyrobca || ""],
    [L.trvanlivost, prod.trvanlivost || ""],
  ];
  // Value starts right after its label (small space), not aligned in table
  let dy = cardY + CARD_POS.details;
  for (const [label, value] of details) {
    setFont(ctx, "bold", "normal", FS.details_label);
    ctx.fillText(label, cardX + COL_RIGHT_X, dy);
    const labelW = ctx.measureText(label + " ").width;

    setFont(ctx, "normal", "normal", FS.details_value);
    const wrappedValue = wrapText(ctx, value, COL_RIGHT_W - labelW);
    if (wrappedValue.length > 0) {
      ctx.fillText(wrappedValue[0], cardX + COL_RIGHT_X + labelW, dy);
      for (let i = 1; i < wrappedValue.length; i++) {
        dy += detLh;
        ctx.fillText(wrappedValue[i], cardX + COL_RIGHT_X, dy);
      }
    }
    dy += detLh;
  }
}

// Draw paper texture. paper_bg's design only fills 60% x 87% of the image
// (rest is white margin). We crop precisely to the decoration area and stretch
// it to fill the entire 12x7 cm card.
function drawBackground(ctx, bg) {
  // White fill behind everything (margins between cards) — saves toner
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // paper_bg is 1819x2573 with 3 cenovky designed at exact positions:
  //   X: 363..1455 (1092 px wide, 60% of image)
  //   Y bands: 110..769, 847..1505, 1583..2242 (659 px each)
  // We crop the FIRST cenovka exactly and stretch to fill our card.
  const bw = bg.naturalWidth;
  const bh = bg.naturalHeight;
  const srcX = Math.round(bw * 0.200);  // 363/1819
  const srcW = Math.round(bw * 0.600);  // 1092/1819
  const srcY = Math.round(bh * 0.043);  // 110/2573
  const srcH = Math.round(bh * 0.256);  // 659/2573

  for (let i = 0; i < 3; i++) {
    ctx.drawImage(bg,
      srcX, srcY, srcW, srcH,                               // source: decoration only
      CARD_X, CARD_OFFSETS_Y[i], CARD_W, CARD_H             // dest: fills entire card
    );
  }

  // Optional: cut marks at card corners (subtle)
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  const m = 25; // mark length
  for (let i = 0; i < 3; i++) {
    const x1 = CARD_X, y1 = CARD_OFFSETS_Y[i];
    const x2 = CARD_X + CARD_W, y2 = y1 + CARD_H;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x1 - m, y1); ctx.lineTo(x1, y1);
    ctx.moveTo(x1, y1 - m); ctx.lineTo(x1, y1);
    // Top-right
    ctx.moveTo(x2, y1); ctx.lineTo(x2 + m, y1);
    ctx.moveTo(x2, y1 - m); ctx.lineTo(x2, y1);
    // Bottom-left
    ctx.moveTo(x1 - m, y2); ctx.lineTo(x1, y2);
    ctx.moveTo(x1, y2); ctx.lineTo(x1, y2 + m);
    // Bottom-right
    ctx.moveTo(x2, y2); ctx.lineTo(x2 + m, y2);
    ctx.moveTo(x2, y2); ctx.lineTo(x2, y2 + m);
    ctx.stroke();
  }
}

async function ensureFontsLoaded() {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load(`bold italic ${ptToPx(FS.brand)}px "${TABAC}"`),
      document.fonts.load(`bold ${ptToPx(FS.zlozenie_label)}px "${TABAC}"`),
      document.fonts.load(`${ptToPx(FS.ingredients)}px "${TABAC}"`),
      document.fonts.load(`italic ${ptToPx(FS.name)}px "${TABAC}"`),
    ]);
  }
}

function paperBgImage() {
  return new Promise((resolve, reject) => {
    const img = document.getElementById("paperBg");
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
      return;
    }
    img.addEventListener("load", () => resolve(img), { once: true });
    img.addEventListener("error", () => reject(new Error("Nepodarilo sa nacitat paper_bg.jpeg")), { once: true });
  });
}

async function generateCenovkyPdf(products, priceField, lang) {
  if (!products || products.length === 0) throw new Error("Ziadne produkty");
  if (typeof window.jspdf === "undefined") throw new Error("jsPDF sa nenacitalo");
  priceField = priceField || "price_ba";
  lang = lang || "sk";

  await ensureFontsLoaded();
  const bg = await paperBgImage();

  const canvas = document.getElementById("pdfCanvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const A4_W_MM = 210;
  const A4_H_MM = 297;

  let firstPage = true;
  for (let i = 0; i < products.length; i += 3) {
    const chunk = products.slice(i, i + 3);

    ctx.clearRect(0, 0, PAGE_W, PAGE_H);
    drawBackground(ctx, bg);

    for (let c = 0; c < chunk.length; c++) {
      drawCard(ctx, chunk[c], CARD_X, CARD_OFFSETS_Y[c], priceField, lang);
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    if (!firstPage) pdf.addPage("a4", "portrait");
    pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM, undefined, "FAST");
    firstPage = false;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`cenovky_doris_${stamp}.pdf`);
}

async function printCenovkyDirect(products, priceField, lang) {
  if (!products || products.length === 0) throw new Error("Ziadne produkty");
  priceField = priceField || "price_ba";
  lang = lang || "sk";

  await ensureFontsLoaded();
  const bg = await paperBgImage();
  const canvas = document.getElementById("pdfCanvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");

  const pages = [];
  for (let i = 0; i < products.length; i += 3) {
    const chunk = products.slice(i, i + 3);
    ctx.clearRect(0, 0, PAGE_W, PAGE_H);
    drawBackground(ctx, bg);
    for (let c = 0; c < chunk.length; c++) {
      drawCard(ctx, chunk[c], CARD_X, CARD_OFFSETS_Y[c], priceField, lang);
    }
    pages.push(canvas.toDataURL("image/jpeg", 0.92));
  }

  const imgs = pages.map(p => `<div class="page"><img src="${p}" alt=""></div>`).join("\n");
  const html = `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<title>Cenovky - Tlac</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  .page {
    width: 210mm;
    height: 297mm;
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }
  .page img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  @media screen {
    body { background: #888; padding: 20px; font-family: sans-serif; }
    .page { box-shadow: 0 4px 16px rgba(0,0,0,0.3); margin: 0 auto 20px; background: white; }
    .hint {
      max-width: 210mm;
      margin: 0 auto 20px;
      padding: 12px 16px;
      background: #fff;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-size: 14px;
    }
    .hint button {
      background: #e30613; color: white; border: none; padding: 8px 16px;
      border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;
    }
  }
  @media print { .hint { display: none; } }
</style>
</head>
<body>
<div class="hint">
  Stlac <strong>Ctrl + P</strong> alebo klikni: <button onclick="window.print()">Tlacit</button>
</div>
${imgs}
<script>
<script>
  window.addEventListener("load", () => {
    setTimeout(() => window.print(), 400);
  });
</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) throw new Error("Nepodarilo sa otvorit okno na tlac - povol pop-up okna pre tuto stranku");
  win.document.write(html);
  win.document.close();
}

window.generateCenovkyPdf = generateCenovkyPdf;
window.printCenovkyDirect = printCenovkyDirect;
