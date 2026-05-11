@echo off
title Auto-push to GitHub - Vyroba cenoviek
color 0E
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo ===============================================
echo   AUTO-PUSH WATCHER
echo ===============================================
echo.
echo Tento skript kontroluje zmeny kazdych 30 sekund
echo a automaticky pushne na GitHub ked nieco najde.
echo.
echo Necha toto okno otvorene. Pre ukoncenie stlac Ctrl+C
echo alebo zatvor okno.
echo.
echo ===============================================
echo.

REM ===== Check git =====
git --version >nul 2>&1
if errorlevel 1 (
    echo [CHYBA] Git nie je nainstalovany.
    pause
    exit /b 1
)

if not exist ".git" (
    echo [CHYBA] Tento priecinok nie je git repozitar.
    echo Najprv spusti Push_to_GitHub.bat na inicializaciu.
    pause
    exit /b 1
)

REM Verify remote is set
git remote -v >nul 2>&1
if errorlevel 1 (
    echo [CHYBA] Git remote nie je nakonfigurovany.
    pause
    exit /b 1
)

REM ===== Watch loop =====
set ITERATION=0
:loop
set /a ITERATION+=1

REM Get current time for log
for /f "tokens=1-3 delims=:., " %%a in ("%TIME%") do set NOW=%%a:%%b:%%c

REM Check for changes (modified, new untracked, deleted, or staged)
git diff --quiet HEAD 2>nul
set DIFF_HEAD=!errorlevel!

REM Count untracked files
set UNTRACKED=0
for /f %%i in ('git ls-files --others --exclude-standard 2^>nul ^| find /c /v ""') do set UNTRACKED=%%i

if "!DIFF_HEAD!"=="0" if "!UNTRACKED!"=="0" (
    echo [!NOW!] [!ITERATION!] Ziadne zmeny. Cakam...
    goto wait
)

REM There are changes — commit + push
echo.
echo [!NOW!] [!ITERATION!] === ZMENY DETEKOVANE ===
git status --short

echo.
echo [!NOW!] Pridavam subory...
git add -A >nul 2>&1

echo [!NOW!] Vytvaram commit...
git commit -m "Auto-update !NOW!" >nul 2>&1
if errorlevel 1 (
    echo [!NOW!] (Ziadne nove zmeny po add - pravdepodobne iba whitespace)
    goto wait
)

echo [!NOW!] Pushujem na GitHub...
git push 2>nul
if errorlevel 1 (
    REM Try with upstream set (first push or after branch reset)
    git push -u origin main 2>&1 | findstr /v /c:"Everything up-to-date"
    if errorlevel 1 (
        echo [!NOW!] [VAROVANIE] Push zlyhal - skusim znova v dalsej iteracii
    ) else (
        echo [!NOW!] [OK] Pushnute na GitHub (s upstream)
