// Vyroba cenoviek - PDF generator (Canvas + jsPDF)
// Replicates Pillow layout exactly: A4 @ 300 DPI = 2481 x 3508 px
"use strict";

const PDF_DPI = 300;
const PAGE_W = 2481;
const PAGE_H = 3508;

// Per-card offsets (Y) for 3 cards per A4 page
const CARD_OFFSETS = [0, 1005, 2063];

// Card content positions (Y, relative to card top)
const CARD_POS = {
  brand: 250,        // big product name title (moved down from 195 to clear trim zone)
  subtitle: 440,     // subtitle / flavor (moved down from 398)
  weight: 518,       // (currently unused in render — kept for parity)
  price: 590,        // price (slightly moved from 580)
  zlozenie_label: 653,
  body: 698,
  details: 653,
};

// Max widths for auto-fit of centered text — must stay inside the visible card frame.
// Match the body column span (LEFT_COL_X=615 to RIGHT_COL_X+W=1883 → ~1268 px).
const TITLE_MAX_W = 1400;     // a bit wider than columns since title decorative
const SUBTITLE_MAX_W = 1300;  // tighter, must fit inside card frame

const LEFT_COL_X = 615;
const LEFT_COL_W = 435;
const RIGHT_COL_X = 1440;
const RIGHT_COL_W = 443;

// Font sizes in pt → convert to px via *DPI/72
const FS = {
  brand: 36,
  name: 18,
  price: 18,
  zlozenie_label: 7,
  ingredients: 5,
  details_label: 7,
  details_value: 7,
};

const TABAC = "Tabac Sans";

function ptToPx(pt) {
  return Math.round(pt * PDF_DPI / 72);
}

// Set canvas font
function setFont(ctx, weight, style, sizePt) {
  // weight: "normal" | "bold"
  // style: "normal" | "italic"
  ctx.font = `${style} ${weight} ${ptToPx(sizePt)}px "${TABAC}"`;
  ctx.textBaseline = "top"; // PIL draws from top-left
}

// Find largest font size (in pt) that keeps `text` within maxWidth on a single line.
function fitFontSize(ctx, text, weight, style, maxSizePt, minSizePt, maxWidth) {
  if (!text) return maxSizePt;
  for (let sz = maxSizePt; sz >= minSizePt; sz -= 1) {
    setFont(ctx, weight, style, sz);
    if (ctx.measureText(text).width <= maxWidth) return sz;
  }
  return minSizePt;
}

// Fit text in a box (maxWidth × maxHeight), allowing wrap to multiple lines.
// Tries decreasing font sizes until wrapped text fits within maxHeight.
// Returns { size, lines, lineH }.
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
  // Last resort at minSize — accept overflow
  setFont(ctx, weight, style, minSizePt);
  const lines = wrapText(ctx, text, maxWidth);
  return { size: minSizePt, lines, lineH: Math.round(ptToPx(minSizePt) * 1.1) };
}

// Word-wrap text within max width using current ctx.font
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

function drawCard(ctx, prod, yOffset) {
  const cx = PAGE_W / 2;
  ctx.fillStyle = "#000000";

  // Available vertical space for each text block (so it doesn't overflow into the next)
  const TITLE_BOX_H = CARD_POS.subtitle - CARD_POS.brand - 20;     // ~170 px
  const SUBTITLE_BOX_H = CARD_POS.price - CARD_POS.subtitle - 20;  // ~130 px

  // Title (brand) — bold italic, centered. Auto-fit: shrink + wrap if needed
  const title = prod.name || "Doris Cookies";
  const titleFit = fitTextInBox(ctx, title, "bold", "italic", FS.brand, 14, TITLE_MAX_W, TITLE_BOX_H);
  setFont(ctx, "bold", "italic", titleFit.size);
  let ty = CARD_POS.brand + yOffset;
  for (const ln of titleFit.lines) {
    const w = ctx.measureText(ln).width;
    ctx.fillText(ln, cx - w / 2, ty);
    ty += titleFit.lineH;
  }

  // Subtitle — bold italic, centered. Auto-fit: wrap to up to 2 lines, shrink if needed
  if (prod.subtitle) {
    const subFit = fitTextInBox(ctx, prod.subtitle, "bold", "italic", FS.name, 9, SUBTITLE_MAX_W, SUBTITLE_BOX_H);
    setFont(ctx, "bold", "italic", subFit.size);
    let sy = CARD_POS.subtitle + yOffset;
    for (const ln of subFit.lines) {
      const w = ctx.measureText(ln).width;
      ctx.fillText(ln, cx - w / 2, sy);
      sy += subFit.lineH;
    }
  }

  // Price — regular, centered
  setFont(ctx, "normal", "normal", FS.price);
  const priceTxt = prod.price || "";
  const priceW = ctx.measureText(priceTxt).width;
  ctx.fillText(priceTxt, cx - priceW / 2, CARD_POS.price + yOffset);

  // Left column: "Zloženie:" label + ingredients body
  setFont(ctx, "bold", "normal", FS.zlozenie_label);
  ctx.fillText("Zloženie:", LEFT_COL_X, CARD_POS.zlozenie_label + yOffset);

  setFont(ctx, "normal", "normal", FS.ingredients);
  const bodyLh = Math.round(ptToPx(FS.ingredients) * 1.30);
  let by = CARD_POS.body + yOffset;
  const ingLines = wrapText(ctx, prod.ingredients || "", LEFT_COL_W);
  for (const ln of ingLines) {
    ctx.fillText(ln, LEFT_COL_X, by);
    by += bodyLh;
  }

  // Right column: details (label + value pairs)
  // Drinks use "Objem" (volume) instead of "Hmotnosť" (weight)
  const isDrink = (prod.category || "") === "Nápoje";
  const weightLabel = isDrink ? "Objem:" : "Hmotnosť:";
  const detLh = Math.round(ptToPx(FS.details_value) * 1.45);
  const details = [
    [weightLabel, prod.weight || ""],
    ["Alergény:", prod.alergeny || ""],
    ["Výrobca:", prod.vyrobca || ""],
    ["Trvanlivosť:", prod.trvanlivost || ""],
  ];
  let dy = CARD_POS.details + yOffset;
  for (const [label, value] of details) {
    setFont(ctx, "bold", "normal", FS.details_label);
    ctx.fillText(label, RIGHT_COL_X, dy);
    const labelW = ctx.measureText(label + " ").width;

    setFont(ctx, "normal", "normal", FS.details_value);
    const wrappedValue = wrapText(ctx, value, RIGHT_COL_W - labelW);
    if (wrappedValue.length > 0) {
      ctx.fillText(wrappedValue[0], RIGHT_COL_X + labelW, dy);
      for (let i = 1; i < wrappedValue.length; i++) {
        dy += detLh;
        ctx.fillText(wrappedValue[i], RIGHT_COL_X, dy);
      }
    }
    dy += detLh;
  }
}

async function ensureFontsLoaded() {
  // document.fonts.ready resolves when all @font-face loads finish
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  // Trigger load of each variant explicitly so the canvas can use them immediately
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
    img.addEventListener("error", () => reject(new Error("Nepodarilo sa načítať paper_bg.jpeg")), { once: true });
  });
}


async function generateCenovkyPdf(products) {
  if (!products || products.length === 0) throw new Error("Žiadne produkty");
  if (typeof window.jspdf === "undefined") throw new Error("jsPDF sa nenačítalo");

  await ensureFontsLoaded();
  const bg = await paperBgImage();

  const canvas = document.getElementById("pdfCanvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");

  // jsPDF setup — A4 portrait
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [PAGE_W, PAGE_H],
    compress: true,
  });

  let firstPage = true;
  for (let i = 0; i < products.length; i += 3) {
    const chunk = products.slice(i, i + 3);

    // Reset canvas + draw paper background
    ctx.clearRect(0, 0, PAGE_W, PAGE_H);
    ctx.drawImage(bg, 0, 0, PAGE_W, PAGE_H);

    // Draw up to 3 cards
    for (let c = 0; c < chunk.length; c++) {
      drawCard(ctx, chunk[c], CARD_OFFSETS[c]);
    }

    // Add canvas as image to PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    if (!firstPage) pdf.addPage([PAGE_W, PAGE_H], "portrait");
    pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
    firstPage = false;
  }


  // Save PDF
  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`cenovky_doris_${stamp}.pdf`);
}

// Expose to global
window.generateCenovkyPdf = generateCenovkyPdf;
