@echo off
chcp 65001 >nul
title Cloudflare Tunnel for TikTok LIVE Studio
echo ============================================================
echo   🌐 TẠO ĐƯỜNG DẪN HTTPS CLOUDFLARE CHO TIKTOK LIVE STUDIO
echo ============================================================
echo.
echo [*] Đang khởi chạy Cloudflare Tunnel kết nối tới port 5173...
echo [*] Hãy tìm dòng link có đuôi: .trycloudflare.com
echo [*] Copy link đó và thêm /?obs=1 vào ô "Link" trong TikTok LIVE Studio.
echo.
"%~dp0cloudflared.exe" tunnel --url http://localhost:5173
pause

