@echo off
chcp 65001 >nul
title Chua Thien Son - TikTok Live Launcher
cd /d "%~dp0"

echo ============================================================
echo   CHUA THIEN SON ONLINE - TIKTOK LIVE RPC
echo   Backend  : .NET 9 C# (Port 5000)
echo   Frontend : ReactJS (Port 5173 / Port 5000)
echo   Tunnel   : Cloudflare Tunnel (Cho TikTok LIVE Studio)
echo ============================================================
echo.

REM 0. Kiem tra thu vien Playwright & TikTok Connector
if not exist "%~dp0scripts\node_modules\playwright" (
    echo [*] Dang cai dat thu vien Playwright va TikTok connector...
    call npm install --prefix "%~dp0scripts"
)

REM 1. Khoi chay C# ASP.NET Core Backend
echo [*] Dang khoi chay C# ASP.NET Core Backend (Port 5000)...
start "Temple C# Backend" /D "%~dp0src\Temple.Server" cmd /k dotnet run

REM 2. Khoi chay React Vite Dev Server
echo [*] Dang khoi chay React Vite Dev Server (Port 5173)...
start "Temple React Client" /D "%~dp0src\Temple.Client" cmd /k npm run dev

REM 3. Khoi chay Cloudflare Tunnel
echo [*] Dang khoi chay Cloudflare Tunnel cho TikTok LIVE Studio...
start "Cloudflare Tunnel" /D "%~dp0" cmd /k node scripts/start_tunnel.js

REM 4. Cho cac may chu khoi dong
echo [*] Dang cho he thong khoi dong hoan tat...
timeout /t 5 /nobreak >nul

REM 5. Tu dong mo trinh duyet
echo [*] Dang mo trinh duyet web...
start http://localhost:5173

echo.
echo ============================================================
echo   HE THONG DA SAN SANG!
echo.
echo   1. Man hinh Live va Dieu Khien : http://localhost:5173
echo   2. Che do OBS 9:16 Sach        : http://localhost:5173/?obs=1
echo   3. Bang dieu khien Admin       : http://localhost:5173/#admin
echo   4. Link Cloudflare OBS         : Xem tren Web hoac file cloudflare_url.txt
echo.
echo   MEO: Link Cloudflare da duoc TU DONG COPY vao chuot (Clipboard)!
echo   Chi can qua TikTok LIVE Studio va bam Ctrl + V vao Custom Web.
echo ============================================================
echo Nhan phim bat ky de dong cua so nay (cac cua so server van tiep tuc chay)...
pause >nul
