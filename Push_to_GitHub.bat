@echo off
title Push to GitHub - Vyroba cenoviek
color 0B
setlocal EnableDelayedExpansion

echo.
echo ===============================================
echo   PUSH PROJEKTU NA GITHUB
echo ===============================================
echo.

cd /d "%~dp0"

REM ===== Check git =====
git --version >nul 2>&1
if errorlevel 1 (
    echo [CHYBA] Git pre Windows nie je nainstalovany.
    echo.
    echo Stiahni ho z: https://git-scm.com/download/win
    echo Pri instalacii nechaj default volby a re-spusti tento BAT.
    pause
    exit /b 1
)

echo Git je k dispozicii.
git --version
echo.

REM ===== Clean up broken .git from previous attempt =====
if exist ".git" (
    echo Najdeny existujuci .git priecinok.
    set /p CLEAN="Chces ho vymazat a zacat odznova? [y/N]: "
    if /i "!CLEAN!"=="y" (
        echo Mazem .git ...
        rmdir /S /Q ".git" 2>nul
        if exist ".git" (
            echo [VAROVANIE] .git sa nepodarilo vymazat - mozno potrebujes Admin prava.
            echo Otvor PowerShell ako Administrator a spusti:
            echo   Remove-Item -Recurse -Force "%~dp0.git"
            echo.
            pause
            exit /b 1
        )
        echo Hotovo.
    ) else (
        echo Pokracujem s existujucim .git.
    )
    echo.
)

REM ===== Get GitHub URL =====
echo ----------------------------------------------
echo Predtym nez budes pokracovat, vytvor si repo
echo na GitHub:
echo.
echo   1) Otvor: https://github.com/new
echo   2) Repository name: vyroba-cenoviek
echo   3) Visibility: Public
echo   4) NEZASKRTAVAJ "Add README", ".gitignore", "License"
echo   5) Klikni "Create repository"
echo   6) Skopiruj URL ktoru ti GitHub ukaze
echo      (typu: https://github.com/USERNAME/vyroba-cenoviek.git)
echo ----------------------------------------------
echo.
set /p REPO_URL="Vloz GitHub URL repozitara: "

if "!REPO_URL!"=="" (
    echo [CHYBA] URL je prazdna. Ukoncujem.
    pause
    exit /b 1
)

echo.
echo Pouzijem URL: !REPO_URL!
echo.

REM ===== Init + commit + push =====
if not exist ".git" (
    echo [1/5] Inicializujem git repozitar...
    git init -b main >nul
    if errorlevel 1 (
        echo [CHYBA] git init zlyhal.
        pause
        exit /b 1
    )
)

echo [2/5] Nastavujem identitu (lokalne pre tento repo)...
git config user.email "jakub.hrebenar@foxford.sk" >nul
git config user.name "Jakub Hrebenar" >nul

echo [3/5] Pridavam vsetky subory...
git add . >nul
if errorlevel 1 (
    echo [CHYBA] git add zlyhal.
    pause
    exit /b 1
)

echo [4/5] Vytvaram commit...
git commit -m "Initial commit: Vyroba cenoviek v1.0" >nul 2>&1
if errorlevel 1 (
    echo (Mozno uz je commit vytvoreny - pokracujem)
)

echo [5/5] Pushujem na GitHub...
git remote remove origin >nul 2>&1
git remote add origin "!REPO_URL!"
git branch -M main
git push -u origin main
if errorlevel 1 (
    echo.
    echo [CHYBA] Push zlyhal.
    echo.
    echo Mozne pricini:
    echo  1) Autentifikacia - GitHub ti mal otvorit prehliadac na prihlasenie
    echo  2) Repo uz obsahuje subory - skus push s vynutenim:
    echo       git push -f -u origin main
    echo  3) Zla URL - over si ze je presne tak ako ti GitHub ukazal
    echo.
    pause
    exit /b 1
)

echo.
echo ===============================================
echo   HOTOVO!
echo ===============================================
echo.
echo Tvoj projekt je na: !REPO_URL!
echo.
echo Otvor v prehliadaci aby si overil ze vsetko sedi.
echo.
echo Dalsi krok: Cloudflare Pages auto-deploy
echo  - dashboard.cloudflare.com
echo  - Workers ^& Pages -^> Create -^> Pages -^> Connect to Git
echo  - vyber tento repozitar
echo.
echo UPDATE workflow:
echo   git add .
echo   git commit -m "popis zmeny"
echo   git push
echo.
pause
