@echo off
chcp 65001 >nul
title TikTok 24/7 VPS Streamer - Chua Thien Son
cd /d "%~dp0"

echo ============================================================
echo   CHUA THIEN SON - TIKTOK LIVE 24/7 CHO VPS
echo   Toi uu dac biet cho Windows Server 2012 R2 / 1GB RAM
echo   CPU: ~1%%  -  RAM: ~25MB (Sieu nhe, khong lo giat lag)
echo ============================================================
echo.

REM 1. Kiem tra ffmpeg.exe
if not exist "ffmpeg.exe" (
    echo [!] Chua tim thay file ffmpeg.exe trong thu muc nay.
    echo [*] Vui long copy file ffmpeg.exe vao day, hoac de script tu dong tai...
    echo.
    set /p AUTO_DL="Ban co muon tu dong tai ffmpeg.exe ve khong? (Y/N): "
    if /i "%AUTO_DL%"=="Y" (
        echo [*] Dang tai ffmpeg.exe (khoang 35MB)...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4/ffmpeg-win32-x64', 'ffmpeg.exe')"
        if exist "ffmpeg.exe" (
            echo [OK] Da tai xong ffmpeg.exe thanh cong!
        ) else (
            echo [Loi] Tai that bai. Vui long tai thu cong va copy ffmpeg.exe vao day.
            pause
            exit /b
        )
    ) else (
        pause
        exit /b
    )
)

REM 2. Doc cau hinh tu file vps_config.txt
set CONFIG_FILE=vps_config.txt
set RTMP_URL=
set STREAM_KEY=
set VIDEO_FILE=video.mp4

if exist "%CONFIG_FILE%" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%CONFIG_FILE%") do (
        if "%%a"=="RTMP_URL" set RTMP_URL=%%b
        if "%%a"=="STREAM_KEY" set STREAM_KEY=%%b
        if "%%a"=="VIDEO_FILE" set VIDEO_FILE=%%b
    )
)

if "%RTMP_URL%"=="" (
    echo Nhap Server URL cua TikTok (Mac dinh: rtmp://live-push.tiktok.com/live/):
    set /p RTMP_URL="> "
)
if "%RTMP_URL%"=="" set RTMP_URL=rtmp://live-push.tiktok.com/live/

if "%STREAM_KEY%"=="" (
    echo Nhap Stream Key cua phien TikTok Live cua ban:
    set /p STREAM_KEY="> "
)

REM Luu lai cau hinh cho cac lan chay sau
echo RTMP_URL=%RTMP_URL%> "%CONFIG_FILE%"
echo STREAM_KEY=%STREAM_KEY%>> "%CONFIG_FILE%"
echo VIDEO_FILE=%VIDEO_FILE%>> "%CONFIG_FILE%"

set FULL_RTMP=%RTMP_URL%%STREAM_KEY%

echo.
echo ============================================================
echo   CHON CHE DO PHAT SONG TREN VPS:
echo ============================================================
echo   1. Phat Vong Lap Video 24/7 (Sieu nhe: 1%% CPU, 25MB RAM - Khuyen dung)
echo   2. Quay truc tiep man hinh trinh duyet Web (540p 20fps)
echo ============================================================
set /p MODE="Chon che do (1 hoac 2) [Mac dinh: 1]: "
if "%MODE%"=="" set MODE=1

if "%MODE%"=="2" (
    echo.
    echo [*] Dang khoi chay Live quay man hinh len TikTok...
    echo [*] Nhan Ctrl + C de dung phat song.
    echo.
    ffmpeg -f gdigrab -framerate 20 -i desktop -c:v libx264 -preset ultrafast -tune zerolatency -b:v 1500k -maxrate 2000k -bufsize 3000k -pix_fmt yuv420p -c:a aac -b:a 96k -ar 44100 -f flv "%FULL_RTMP%"
) else (
    if not exist "%VIDEO_FILE%" (
        echo.
        echo [Canh bao] Chua tim thay file '%VIDEO_FILE%' trong thu muc!
        echo Ban hay copy 1 video chua/tung kinh (dinh dang mp4) vao day va dat ten la 'video.mp4'.
        pause
        exit /b
    )
    echo.
    echo [*] Dang phat song vong lap video '%VIDEO_FILE%' len TikTok 24/7...
    echo [*] Tieu thu CPU: ~1%% - RAM: ~25MB (Chay muot 24/7 tren VPS 1GB)
    echo [*] Nhan Ctrl + C de dung phat song.
    echo.
    ffmpeg -re -stream_loop -1 -i "%VIDEO_FILE%" -c:v copy -c:a aac -b:a 128k -ar 44100 -f flv "%FULL_RTMP%"
)

pause
