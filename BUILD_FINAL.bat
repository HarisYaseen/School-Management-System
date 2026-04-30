@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo    SMS Connect - PRODUCTION FAST BUILD
echo ==========================================
echo.

echo [1/3] Packaging Electron (dist/win-unpacked)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Electron build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Creating Compressed Installer...
powershell -ExecutionPolicy Bypass -File "installer_source\merge_installer.ps1"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Installer creation failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Cleaning up temporary files...
if exist "installer_source\app.zip" del /f /q "installer_source\app.zip"

echo.
echo [DONE] Build completed successfully!
echo Check the 'dist' folder for the setup file.
echo.
pause
