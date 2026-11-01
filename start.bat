@echo off
chcp 65001 >nul
echo ============================================================
echo   🪷 KHỞI ĐỘNG HỆ THỐNG CHÙA THIÊN SƠN TIKTOK LIVE RPC
echo   🔧 Backend: .NET 9 C# (Port 5000)
echo   ⚛️ Frontend: ReactJS (Port 5173 / Port 5000)
echo ============================================================

REM 1. Khởi chạy C# Backend trong cửa sổ mới
echo [*] Đang khởi chạy C# ASP.NET Core Backend (Port 5000)...
start "Temple C# Backend (Port 5000)" cmd /k "cd /d "%~dp0src\Temple.Server" && dotnet run"

REM 2. Khởi chạy React Vite Dev Server trong cửa sổ mới
echo [*] Đang khởi chạy ReactJS Vite Dev Server (Port 5173)...
start "Temple React Client (Port 5173)" cmd /k "cd /d "%~dp0src\Temple.Client" && npm run dev"

REM 3. Khởi chạy Cloudflare Tunnel cho TikTok LIVE Studio / OBS
echo [*] Đang khởi chạy Cloudflare Tunnel cho TikTok LIVE Studio...
start "Cloudflare Tunnel (TikTok Live)" cmd /k "cd /d "%~dp0" && node scripts/start_tunnel.js"

REM 4. Chờ 4 giây cho cả hệ thống khởi động hoàn tất
echo [*] Đang chờ máy chủ khởi động hoàn tất...
timeout /t 4 /nobreak >nul

REM 5. Tự động mở trình duyệt
echo [*] Mở trình duyệt tự động...
start http://localhost:5173

echo.
echo ============================================================
echo ✅ HỆ THỐNG ĐÃ SẴN SÀNG!
echo.
echo 📺 Màn hình Live + Điều Khiển : http://localhost:5173
echo 📺 Chế độ OBS 9:16 Sạch       : http://localhost:5173/?obs=1
echo 🎛️ Bảng điều khiển Admin       : http://localhost:5173/#admin
echo 🌐 Link Cloudflare OBS         : Mở file cloudflare_url.txt hoặc xem trên giao diện web
echo.
echo 💡 Mẹo: Link Cloudflare Tunnel đã được tự động copy vào chuột (Clipboard)!
echo    Chỉ cần qua TikTok LIVE Studio và bấm Ctrl + V vào nguồn Trình duyệt (Custom Web).
echo ============================================================
echo Nhấn phím bất kỳ để đóng cửa sổ này (các cửa sổ dịch vụ vẫn tiếp tục chạy)...
pause >nul
