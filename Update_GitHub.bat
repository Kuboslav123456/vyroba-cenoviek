@echo off
title Update GitHub - Vyroba cenoviek
color 0B
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo ===============================================
echo   UPDATE PROJEKTU NA GITHUB
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

REM ===== Show what changed =====
echo Zmeneny subory od posledneho push:
echo -----------------------------------------------
git status --short
echo -----------------------------------------------
echo.

REM Check if there's anything to commit
git diff --quiet HEAD 2>nul
set DIFF_EXIT=!errorlevel!
git diff --cached --quiet 2>nul
set CACHED_EXIT=!errorlevel!

REM Check for untracked files
for /f %%i in ('git ls-files --others --exclude-standard ^| find /c /v ""') do set UNTRACKED=%%i

if "!DIFF_EXIT!"=="0" if "!CACHED_EXIT!"=="0" if "!UNTRACKED!"=="0" (
    echo Ziadne zmeny od posledneho push.
    echo.
    echo Stale chces push? (napr. retry zlyhaneho push)
    set /p RETRY="[y/N]: "
    if /i not "!RETRY!"=="y" (
        echo Ukoncujem.
        pause
        exit /b 0
    )
)

REM ===== Get commit message =====
echo.
set /p MSG="Popis zmeny (Enter = 'Update'): "
if "!MSG!"=="" set MSG=Update

echo.
echo [1/3] Pridavam zmeny...
git add .
if errorlevel 1 (
    echo [CHYBA] git add zlyhal.
    pause
    exit /b 1
)

echo [2/3] Vytvaram commit...
git commit -m "!MSG!" 2>nul
if errorlevel 1 (
    echo (Mozno nie su nove zmeny - pokracujem na push)
)

echo [3/3] Pushujem na GitHub...
git push
if errorlevel 1 (
    echo.
    echo [CHYBA] Push zlyhal. Pozri vyssie pre detaily.
    pause
    exit /b 1
)

echo.
echo ===============================================
echo   HOTOVO!
echo ===============================================
echo.
echo Zmeny boli pushnute na GitHub.
echo.
echo Ak mas zapnute GitHub Pages alebo Cloudflare Pages
echo auto-deploy, nova verzia bude live za 1-2 min.
echo.
pause
