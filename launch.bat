@echo off
rem ---- Miner Snake launcher (project-local) ----
rem Relaunch self minimized so the console stays out of the way.
if /I "%~1" NEQ "_min" (
    start "Miner Snake" /min cmd /c "%~f0" _min
    exit /b
)

setlocal
cd /d "%~dp0"

if not exist node_modules (
    echo Installing dependencies for the first time...
    call npm install || goto :err
)

if not exist dist\index.html (
    echo Building game...
    call npm run build || goto :err
)

echo Launching Miner Snake...
call npx electron .
goto :eof

:err
echo.
echo Setup failed. Press any key to close.
pause >nul
exit /b 1
