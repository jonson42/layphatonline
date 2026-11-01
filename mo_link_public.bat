@echo off
chcp 65001 >nul
title [CLOUDFLARE] TAO LINK CONG KHAI CHO VPS
cd /d "%~dp0"
color 0B

echo =====================================================================
echo    MO LINK CONG KHAI CHO VPS NAT (CLOUDFLARE TUNNEL)
echo =====================================================================
echo.

if not exist "cloudflared.exe" (
    echo [!] CHUA CO FILE cloudflared.exe TRONG THU MUC NAY!
    echo.
    echo [*] Cach nhanh nhat:
    echo     Ban hay Copy file "cloudflared.exe" tu may tinh ca nhan
    echo     (nam o D:\Source\AI\lephat\cloudflared.exe)
    echo     roi dan (Paste) vao thu muc nay tren VPS!
    echo.
    echo [*] Hoac ban co muon VPS tu tai ve (khoang 55MB, can 1-2 phut)?
    set /p CHOICE="Nhap Y de tai tu dong, hoac phim bat ky de thoat: "
    if /i "%CHOICE%"=="Y" (
        echo [*] Dang tai cloudflared.exe, vui long cho...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', 'cloudflared.exe')"
    ) else (
        echo [*] Vui long copy cloudflared.exe vao day roi chay lai script.
        pause
        exit /b 1
    )
)

if not exist "cloudflared.exe" (
    echo [LOI] Khong tim thay cloudflared.exe. Vui long copy file vao day!
    pause
    exit /b 1
)

echo.
echo [*] Dang ket noi Cloudflare tao duong link HTTPS cong khai...
echo [*] Vui long doi 3-5 giay.
echo [*] Khi man hinh hien dong link co chua:
echo.
echo     https://xxxx-xxxx-xxxx.trycloudflare.com
echo.
echo     -> Do chinh la link cong khai de ban dan vao trinh duyet / OBS!
echo =====================================================================
echo.

cloudflared.exe tunnel --url http://localhost:8080

pause
