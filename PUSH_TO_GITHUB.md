# Push do GitHub — krok po kroku

Tento návod ti pomôže nahrať tento projekt ako **verejný** repozitár `vyroba-cenoviek` na GitHub a (voliteľne) prepojiť na Cloudflare Pages pre auto-deploy pri každej zmene.

## Predpoklady (jednorazovo)

1. **Git pre Windows** — ak nemáš, stiahni z https://git-scm.com/download/win (default voľby)
2. **GitHub účet** — https://github.com/signup ak ešte nemáš
3. **GitHub CLI** (voliteľné, ale uľahčí to) — https://cli.github.com/

## Krok 1 — vyčisti pokazený `.git` priečinok

Z predošlého pokusu zostal nedokončený `.git` priečinok. Otvor **PowerShell** ako **Administrátor** (Win → napíš PowerShell → pravým tlačidlom → Run as administrator):

```powershell
cd "C:\Users\jakub.hrebenar\Desktop\TEST\web"
Remove-Item -Recurse -Force .git
```

## Krok 2 — vytvor GitHub repozitár

Cez prehliadač:

1. Choď na https://github.com/new
2. **Repository name:** `vyroba-cenoviek`
3. **Description:** `Webová aplikácia na tvorbu cenoviek pre Doris Cookies`
4. **Visibility:** Public
5. **NEZAŠKRTNI** „Add a README file" (máme vlastný)
6. **NEZAŠKRTNI** „Add .gitignore" (máme vlastný)
7. **License:** None (máme vlastný LICENSE súbor)
8. Klikni **Create repository**

GitHub ti zobrazí URL typu `https://github.com/<tvoj-username>/vyroba-cenoviek.git` — túto URL si zapamätaj.

## Krok 3 — lokálny commit + push

Otvor **PowerShell** (stačí obyčajný, nie Admin) a spusti tieto príkazy postupne:

```powershell
cd "C:\Users\jakub.hrebenar\Desktop\TEST\web"

# Inicializuj git repo
git init -b main

# Nastav identitu (raz za projekt)
git config user.email "jakub.hrebenar@foxford.sk"
git config user.name "Jakub Hrebenar"

# Prvý commit
git add .
git commit -m "Initial commit: Vyroba cenoviek v1.0"

# Prepoj s GitHub (URL nahraď svojou)
git remote add origin https://github.com/<TVOJ-USERNAME>/vyroba-cenoviek.git

# Push
git push -u origin main
```

Pri `git push` ťa GitHub vyzve na autentifikáciu — buď v prehliadači (recommended) alebo cez Personal Access Token. Stačí raz.

**Po push** si overit na `https://github.com/<TVOJ-USERNAME>/vyroba-cenoviek` — všetko by malo byť tam.

## Krok 4 — Cloudflare Pages auto-deploy (voliteľné, odporúčam)

Ak chceš aby každé `git push` automaticky aktualizovalo web verziu:

1. **Cloudflare Dashboard** → Workers & Pages → **Create** → **Pages** → **Connect to Git**
2. **Authorize Cloudflare** v GitHub (vyber `vyroba-cenoviek` repo)
3. **Set up builds and deployments:**
   - Project name: `vyroba-cenoviek`
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *(prázdne)*
   - Build output directory: `/`
4. **Save and Deploy**

Po prvom deploy dostaneš URL `vyroba-cenoviek.pages.dev` — toto pošli kolegovi.

**Workflow updates:**

```powershell
cd "C:\Users\jakub.hrebenar\Desktop\TEST\web"
# ... urob zmeny v súboroch ...
git add .
git commit -m "Popis zmeny"
git push
```

Cloudflare automaticky deploy-ne novú verziu za ~30 sekúnd.

## Krok 5 — Cloudflare Access ochrana (voliteľné)

Aby URL nebola prístupná verejne:

1. **Zero Trust** dashboard → **Access** → **Applications** → **Add an application** → **Self-hosted**
2. Application URL: tvoja `pages.dev` adresa alebo custom doména
3. **Identity providers:** One-time PIN
4. **Policy:**
   - Action: Allow
   - Include: Emails → `jakub.hrebenar@foxford.sk` + email kolegu
5. Save

Kolega pri otvorení URL dostane mailom 6-miestny kód, zadá ho a má prístup. Nikto iný nedostane dnu, ani ak by mu URL niekto poslal.

## Update workflow zhrnutý

```powershell
# Edituj kód (cez VS Code, Notepad++, čokoľvek)
# Otvor PowerShell:
cd "C:\Users\jakub.hrebenar\Desktop\TEST\web"
git add .
git commit -m "Krátky popis zmeny"
git push
# → Cloudflare Pages auto-deploy za 30 s
```

## Troubleshooting

**„fatal: refusing to merge unrelated histories"** pri prvom push — môže nastať ak GitHub repo nie je úplne prázdny. Vynúť push:
```powershell
git push -f -u origin main
```
(Iba pri prvom push, neskôr nikdy `-f` nepoužívaj.)

**Git autentifikácia zlyháva** — najjednoduchšie cez **GitHub CLI**:
```powershell
winget install GitHub.cli
gh auth login
```
Postupuj ako sa pýta (HTTPS, browser auth). Potom `git push` bude fungovať.

**Veľký push (paper_bg.jpeg má ~870 KB)** — to je v poriadku, GitHub povolí súbory do 100 MB.
