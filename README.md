# Výroba cenoviek

Webová aplikácia pre tvorbu produktových cenoviek (price tags) pre pekáreň
[Doris Cookies](https://www.doriscookies.sk). Beží v prehliadači, generuje PDF v presnom layoute pripravenom na tlač A4 @ 300 DPI.

## Funkcie

- **CRUD produktov** s autosave do `localStorage` (debounce 600 ms)
- **Kategórie** — Cookies, Koláče, Cheesecake, Bagely, Croissanty, Praclík, Nápoje, atď.
- **Vyhľadávač** s podporou diakritiky („kolac" nájde „Koláč")
- **Validácia** s vizuálnym upozornením na chýbajúce / nesprávne polia
- **Auto-formát** ceny, hmotnosti/objemu, alergénov, trvanlivosti
- **Pre kategóriu Nápoje** sa pole „Hmotnosť" automaticky prepne na „Objem" (a akceptuje ml, l, dl, cl)
- **Multi-select dialóg** pre výber produktov do PDF
- **PDF generátor** v prehliadači (Canvas + jsPDF), 3 cenovky na A4
- **Smart auto-fit textu** — nadpis a popis sa automaticky zalamujú a zmenšujú aby sa zmestili do karty
- **Export/Import JSON** pre zálohy a prenos dát medzi prehliadačmi

## Štruktúra

```
.
├── index.html              UI skeleton
├── styles.css              Martinus-inspired štýl
├── app.js                  Stav, autosave, CRUD, validácia, search, modal
├── pdf.js                  Canvas + jsPDF generátor
├── data.json               Počiatočné dáta (východiskové produkty)
├── paper_bg.jpeg           Pozadie cenoviek (300 DPI)
├── fonts/                  Tabac Sans .otf súbory
├── Spustit_lokalne.bat     Lokálny launcher (Windows)
├── README.md               (tento súbor)
└── LICENSE                 MIT
```

## Spustenie lokálne

**Aplikácia musí ísť cez webserver, nie cez `file://`** — kvôli CORS reštrikciám pri načítaní fontov a `data.json`.

**Windows:** Dvojklik na `Spustit_lokalne.bat` — spustí Python http server na `http://localhost:8765/` a otvorí prehliadač.

**Mac/Linux:** V termináli v tomto priečinku:
```bash
python3 -m http.server 8765
```
Otvor `http://localhost:8765/`.

## Nasadenie do Cloudflare Pages

### Cez Wrangler CLI (najrýchlejšie)

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name vyroba-cenoviek
```

### Cez Cloudflare Dashboard (Direct Upload)

1. Workers & Pages → Create → Pages → Direct Upload
2. Project name: `vyroba-cenoviek`
3. Drag & drop tento priečinok (alebo zip)
4. Deploy → po ~30 s je live na `vyroba-cenoviek.pages.dev`

### Cez Git auto-deploy

1. Workers & Pages → Create → Pages → Connect to Git
2. Vyber tento repozitár
3. Build settings:
   - Build command: *(prázdne)*
   - Output directory: `/`
4. Každý push do `main` = auto-deploy

### Vlastná doména

Pages → Custom domains → Add `cenovky.doriscookies.sk` (alebo iná).

### Cloudflare Access (autentifikácia)

Pre ochranu URL pred verejným prístupom:

1. Zero Trust → Access → Applications → Add → Self-hosted
2. URL: `cenovky.doriscookies.sk`
3. Policy: emails matching list of allowed users
4. Identity provider: One-time PIN (cez email) alebo Google/Microsoft SSO

Pred vstupom Cloudflare pošle magic link na povolený email.

## Stack

- HTML/CSS/JS bez frameworku (vanilla, no build step)
- [jsPDF](https://github.com/parallax/jsPDF) (CDN) pre PDF generovanie
- Tabac Sans typeface (Suitcase Type Foundry — licencovaný separately)

## Licencia

MIT (kód) — viď [LICENSE](./LICENSE).
**Poznámka:** Tabac Sans fonty v `fonts/` sú licencované zvlášť a vyžadujú samostatnú licenciu.

## Plán ďalších krokov

- Cloudflare D1 ako zdieľaná databáza (multi-user real-time sync)
- Cloudflare Worker API medzi frontendom a D1
- História zmien (audit log)
- Hromadný import z Excelu/CSV
- Vektorové PDF (zmenšenie veľkosti súboru, ostrejší text)
