@echo off
chcp 65001 >nul
title DONG GOI CHUA THIEN SON LIVE CHO SERVER
cd /d "%~dp0"

echo =====================================================================
echo      DONG GOI (PUBLISH) CHUA THIEN SON DE BO LEN MAY CHU / VPS
echo =====================================================================
echo.
echo Chon kieu dong goi:
echo [1] Self-Contained Win-x64 (KHUYEN DUNG cho Windows Server / VPS 2012 R2)
echo     - Tu mang theo runtime, SERVER KHONG CAN CAI DAT .NET 9!
echo     - Chi can copy len VPS la chay duoc ngay.
echo.
echo [2] Framework-Dependent (Sieu nhe ~5MB)
echo     - Yeu cau server da cai dat san .NET 9 Runtime.
echo.
echo [3] Linux-x64 (Cho VPS Ubuntu / Debian / CentOS)
echo.

set TARGET_CHOICE=1
set /p TARGET_CHOICE="Nhap lua chon [1-3] (Mac dinh 1): "

if "%TARGET_CHOICE%"=="" set TARGET_CHOICE=1

set OUT_DIR=publish_server
set ZIP_NAME=LayPhatOnline_Server.zip

echo.
echo [*] Dang don dep thu muc publish cu...
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
if exist "%ZIP_NAME%" del /f /q "%ZIP_NAME%"

echo.
echo =====================================================================
echo BUOC 1: BIEN DICH GIAO DIEN WEB (REACT / VITE)
echo =====================================================================
cd src\Temple.Client
call npm run build
if %errorlevel% neq 0 (
    echo [LOI] Khong the build React Client! Vui long kiem tra lai.
    cd /d "%~dp0"
    pause
    exit /b 1
)
cd /d "%~dp0"
echo [OK] Bien dich React Client thanh cong!

echo.
echo =====================================================================
echo BUOC 2: BIEN DICH VA XUAT BAN BACKEND (C# .NET 9)
echo =====================================================================

if "%TARGET_CHOICE%"=="1" (
    echo [*] Dang publish Self-Contained cho Windows x64...
    dotnet publish src\Temple.Server\Temple.Server.csproj -c Release -r win-x64 --self-contained true -o "%OUT_DIR%"
) else if "%TARGET_CHOICE%"=="2" (
    echo [*] Dang publish Framework-Dependent cho Windows...
    dotnet publish src\Temple.Server\Temple.Server.csproj -c Release -o "%OUT_DIR%"
) else (
    echo [*] Dang publish Self-Contained cho Linux x64...
    dotnet publish src\Temple.Server\Temple.Server.csproj -c Release -r linux-x64 --self-contained true -o "%OUT_DIR%"
)

if %errorlevel% neq 0 (
    echo [LOI] Dotnet publish that bai! Vui long kiem tra thong bao loi o tren.
    pause
    exit /b 1
)
echo [OK] Publish backend thanh cong!

echo.
echo =====================================================================
echo BUOC 3: DONG GOI DU LIEU, SCRIPTS VA FILE CHAY SERVER
echo =====================================================================

REM Copy du lieu state
if not exist "%OUT_DIR%\data" mkdir "%OUT_DIR%\data"
if exist "data" xcopy /s /e /y /q "data\*" "%OUT_DIR%\data\"

REM Copy scripts TikTok connector
if not exist "%OUT_DIR%\scripts" mkdir "%OUT_DIR%\scripts"
if exist "scripts\package.json" copy /y "scripts\package.json" "%OUT_DIR%\scripts\" >nul
if exist "scripts\package-lock.json" copy /y "scripts\package-lock.json" "%OUT_DIR%\scripts\" >nul
if exist "scripts\tiktok_bridge.js" copy /y "scripts\tiktok_bridge.js" "%OUT_DIR%\scripts\" >nul
if exist "publish_server\scripts\node.exe" copy /y "publish_server\scripts\node.exe" "%OUT_DIR%\scripts\" >nul
if exist "scripts\node_modules" xcopy /s /e /y /q "scripts\node_modules\*" "%OUT_DIR%\scripts\node_modules\" >nul
if exist "scripts\tts_worker.py" copy /y "scripts\tts_worker.py" "%OUT_DIR%\scripts\" >nul
if exist "scripts\start_tunnel.js" copy /y "scripts\start_tunnel.js" "%OUT_DIR%\scripts\" >nul

REM Copy script livestream sieu nhe vps_live.bat
if exist "vps_live.bat" copy /y "vps_live.bat" "%OUT_DIR%\" >nul
if exist "mo_link_public.bat" copy /y "mo_link_public.bat" "%OUT_DIR%\" >nul

REM Tao file chay server start_server.bat
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo title [SERVER] CHUA THIEN SON - TIKTOK LIVE RPC
    echo cd /d "%%~dp0"
    echo color 0A
    echo.
    echo echo =====================================================================
    echo echo         MAY CHU CHUA THIEN SON - TIKTOK LIVE RPC
    echo echo =====================================================================
    echo echo.
    echo echo [*] Dang khoi dong Web Server tren cong 5000...
    echo echo.
    echo echo [*] Link xem livestream tren trinh duyet / OBS:
    echo echo     - Tren may nay:   http://localhost:5000/?obs=1
    echo echo     - Tu may khac:    http://[IP_MAY_CHU]:5000/?obs=1
    echo echo.
    echo echo [*] Luu y Mo Port Tuong Lua (Neu khong truy cap duoc tu may khac^):
    echo echo     Mo PowerShell ^(Admin^) tren VPS va chay lenh sau:
    echo echo     New-NetFirewallRule -DisplayName "ChuaThienSon" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
    echo echo.
    echo echo [*] Nhan Ctrl+C de dung may chu.
    echo echo =====================================================================
    echo echo.
    echo if exist "Temple.Server.exe" ^(
    echo     Temple.Server.exe --urls http://0.0.0.0:5000
    echo ^) else ^(
    echo     dotnet Temple.Server.dll --urls http://0.0.0.0:5000
    echo ^)
    echo.
    echo pause
) > "%OUT_DIR%\start_server.bat"

REM Neu la Linux tao file start_server.sh
(
    echo #!/bin/bash
    echo cd "$(dirname "$0")"
    echo echo "Starting Chua Thien Son Server on port 5000..."
    echo if [ -f "./Temple.Server" ]; then
    echo     chmod +x ./Temple.Server
    echo     ./Temple.Server --urls http://0.0.0.0:5000
    echo else
    echo     dotnet Temple.Server.dll --urls http://0.0.0.0:5000
    echo fi
) > "%OUT_DIR%\start_server.sh"

echo [OK] Da tao day du cac file khoi chay va scripts phu tro!

echo.
echo =====================================================================
echo BUOC 4: NEN THU MUC THANH FILE ZIP (DE DANG COPY LEN VPS)
echo =====================================================================
echo [*] Dang nen %OUT_DIR% thanh %ZIP_NAME%...
powershell -Command "Compress-Archive -Path '%OUT_DIR%\*' -DestinationPath '%ZIP_NAME%' -Force"

if exist "%ZIP_NAME%" (
    echo [OK] DA TAO THANH CONG: %ZIP_NAME%
) else (
    echo [!] Khong the tao file zip tu dong, ban van co the copy ca thu muc %OUT_DIR%
)

echo.
echo =====================================================================
echo                   HOAN TAT XUAT BAN (PUBLISH)
echo =====================================================================
echo.
echo [+] Thu muc xuat ban: %~dp0%OUT_DIR%
if exist "%ZIP_NAME%" echo [+] File zip tron goi: %~dp0%ZIP_NAME%
echo.
echo HUONG DAN SU DUNG TREN VPS / SERVER:
echo 1. Copy file "%ZIP_NAME%" (hoac thu muc %OUT_DIR%) len VPS.
echo 2. Giai nen ra 1 thu muc bat ky tren VPS.
echo 3. Nhap dup chuot vao file "start_server.bat" de bat may chu!
echo 4. Mo trinh duyet tren VPS hoac may ca nhan truy cap:
echo    http://localhost:5000/?obs=1  (hoac http://[IP_VPS]:5000/?obs=1)
echo.
echo =====================================================================
pause
