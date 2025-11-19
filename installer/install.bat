@echo off
echo ========================================
echo    Desktop Mate - Easy Installer
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org
    echo 2. Download and install Node.js
    echo 3. Restart this installer
    echo.
    pause
    exit /b 1
)

echo Node.js found! Installing Desktop Mate...
echo.

REM Install Electron
echo Installing Electron...
npm install electron
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install Electron!
    echo Please check your internet connection.
    pause
    exit /b 1
)

echo.
echo Creating desktop shortcut...

REM Get current directory
set "currentdir=%cd%"

REM Create desktop shortcut
set "shortcut=%USERPROFILE%\Desktop\Desktop Mate.bat"
echo @echo off > "%shortcut%"
echo title Desktop Mate >> "%shortcut%"
echo cd /d "%currentdir%" >> "%shortcut%"
echo npx electron . >> "%shortcut%"

REM Also create a run script in current folder
echo @echo off > "run.bat"
echo title Desktop Mate >> "run.bat"
echo npx electron . >> "run.bat"

echo.
echo ========================================
echo    Installation Complete!
echo ========================================
echo.
echo Desktop Mate has been installed successfully!
echo.
echo To run Desktop Mate:
echo - Double-click "Desktop Mate.bat" on your desktop
echo - Or double-click "run.bat" in this folder
echo - Or run "npx electron ." in this folder
echo.
echo Features:
echo - Drag your mate anywhere on screen
echo - Right-click for actions menu
echo - Walk, Jump, Talk, Dance animations
echo - Switch between boy/girl characters
echo.
echo Enjoy your desktop companion!
echo.
pause