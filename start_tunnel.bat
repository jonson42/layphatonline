@echo off
chcp 65001 >nul
title Cloudflare Tunnel for TikTok LIVE Studio
cd /d "%~dp0"
node scripts/start_tunnel.js
pause
