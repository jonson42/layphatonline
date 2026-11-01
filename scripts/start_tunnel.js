const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const cloudflaredPath = path.resolve(rootDir, 'cloudflared.exe');
const urlFilePath = path.resolve(rootDir, 'cloudflare_url.txt');

if (!fs.existsSync(cloudflaredPath)) {
  console.error(`[Lỗi] Không tìm thấy file cloudflared.exe tại: ${cloudflaredPath}`);
  process.exit(1);
}

// Xóa file URL cũ nếu có
try {
  if (fs.existsSync(urlFilePath)) {
    fs.unlinkSync(urlFilePath);
  }
} catch (_) {}

console.log('======================================================================');
console.log('  🌐 CLOUDFLARE TUNNEL CHO TIKTOK LIVE STUDIO / OBS');
console.log('  📡 Đang kết nối và khởi tạo đường dẫn HTTPS an toàn...');
console.log('======================================================================\n');

const child = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:5173'], {
  cwd: rootDir
});

let capturedUrl = null;

function handleData(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!capturedUrl) {
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      capturedUrl = match[0];
      const obsUrl = `${capturedUrl}/?obs=1`;

      // 1. Ghi ra file cloudflare_url.txt
      try {
        fs.writeFileSync(urlFilePath, obsUrl, 'utf8');
      } catch (err) {
        console.error('[Lỗi ghi file]', err);
      }

      // 2. Tự động Copy vào Clipboard của Windows
      try {
        const clip = spawn('clip');
        clip.stdin.write(obsUrl);
        clip.stdin.end();
      } catch (_) {}

      // 3. Hiển thị khung thông báo cực kỳ rõ ràng
      console.log('\n');
      console.log('╔══════════════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 ĐÃ TẠO XONG LINK CHO TIKTOK LIVE STUDIO / OBS!                   ║');
      console.log('╠══════════════════════════════════════════════════════════════════════╣');
      console.log(`║  👉 LINK OBS CỦA BẠN:                                               ║`);
      console.log(`║     ${obsUrl.padEnd(64)} ║`);
      console.log('║                                                                      ║');
      console.log('║  ✅ ĐÃ TỰ ĐỘNG COPY VÀO BỘ NHỚ TẠM (CLIPBOARD)!                      ║');
      console.log('║  👉 Bạn chỉ cần qua TikTok LIVE Studio, bấm Ctrl + V là dán xong!    ║');
      console.log('║  💾 Link cũng được lưu tự động tại file: cloudflare_url.txt          ║');
      console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
    }
  }
}

child.stdout.on('data', handleData);
child.stderr.on('data', handleData);

child.on('close', (code) => {
  console.log(`\n[Cloudflare Tunnel] Đã ngắt kết nối (Exit code: ${code})`);
});

process.on('SIGINT', () => {
  child.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill();
  process.exit(0);
});
