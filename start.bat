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

REM 3. Chờ 4 giây cho cả 2 server khởi động hoàn tất
echo [*] Đang chờ máy chủ khởi động hoàn tất...
timeout /t 4 /nobreak >nul

REM 4. Tự động mở trình duyệt
echo [*] Mở trình duyệt tự động...
start http://localhost:5173

echo.
echo ============================================================
echo ✅ HỆ THỐNG ĐÃ SẴN SÀNG!
echo.
echo 📺 Màn hình Live + Điều Khiển : http://localhost:5173
echo 📺 Chế độ OBS 9:16 Sạch       : http://localhost:5173/?obs=1
echo 🎛️ Bảng điều khiển Admin       : http://localhost:5173/#admin
echo.
echo 💡 Mẹo: Bạn cũng có thể truy cập trực tiếp qua cổng C#:
echo    http://localhost:5000 (Chạy trực tiếp bản build React)
echo ============================================================
echo Nhấn phím bất kỳ để đóng cửa sổ này (2 cửa sổ server vẫn tiếp tục chạy)...
pause >nul
