@echo off
title Vyroba cenoviek - lokalny server

cd /d "%~dp0"

echo.
echo ===============================================
echo   VYROBA CENOVIEK - lokalny test
echo ===============================================
echo.
echo Spustam Python webserver...
echo.
echo Po spusteni otvor v prehliadaci:
echo   http://localhost:8765/
echo.
echo Server zastavis stlacenim Ctrl+C alebo zatvorenim okna.
echo ===============================================
echo.

REM Try py launcher first
py -m http.server 8765 2>nul
if not errorlevel 1 goto :end

REM Try python
python -m http.server 8765 2>nul
if not errorlevel 1 goto :end

REM Try python3
python3 -m http.server 8765 2>nul
if not errorlevel 1 goto :end

echo.
echo ===============================================
echo [CHYBA] Python sa nepodarilo spustit.
echo ===============================================
echo.
echo Skusal som tieto prikazy:
echo   py -m http.server 8765
echo   python -m http.server 8765
echo   python3 -m http.server 8765
echo.
echo Mozne riesenia:
echo  1) Stiahni Python z: https://www.python.org/downloads/
echo     (pri instalacii zaskrtni "Add Python to PATH")
echo.
echo  2) Skontroluj ci mas Python: otvor cmd a napis "py --version"
echo.
echo  3) Skus pravym tlacidlom na tento BAT
echo     a vyber "Run as