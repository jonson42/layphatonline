# 🪷 Chùa Thiên Sơn Online — TikTok Live RPC (C# .NET 9 + ReactJS)

Bản clone hoàn chỉnh với kiến trúc hiện đại bằng **C# (ASP.NET Core .NET 9)** và **ReactJS** của dự án [tiktok-live-temple-rpc](https://github.com/zane-tv/tiktok-live-temple-rpc). Chuẩn khung dọc **9:16 (`1080×1920`)** cho **OBS Studio / TikTok Live Studio**, tích hợp đầy đủ tính năng tâm linh tương tác trực tiếp qua bình luận, thả tim, follow/share và tặng quà TikTok.

---

## 🌟 Tính Năng Hoàn Chỉnh

1. **Khung Chánh Điện 9:16 Chuẩn (`1080×1920`)**:
   - Hình nền Đức Phật A Di Đà sắc nét.
   - Hệ thống Hào quang xoay chuyển vạn trượng (SVG Dharma Wheel & Sunburst rays, không che mặt Phật).
   - Đèn hoa sen tỏa sáng trên tay Đức Phật.
   - Cột sáng linh thiêng & Lư Hương Đồng với các nén nhang đang cháy tỏa khói và tàn đỏ.
2. **Nhân Vật Phật Tử & Hoạt Cảnh Đảnh Lễ Tam Bái (8-Frame Sprite Stack)**:
   - Phật tử mặc áo lam bước từng bước dọc thảm đỏ hoa sen tiến lên trước Lư Hương (`walk1`, `walk2`).
   - Hạ gối quỳ xuống đệm (`kneelDown`, `kneel`).
   - Thực hiện 3 lạy Ngũ thể đầu địa (`forehead` -> `bowMid` -> `prostrate` -> `prostrateDeep`).
   - Bóng thoại (Wish bubble) hiển thị lời cầu nguyện và thẻ tên thí chủ.
3. **Đạo Tràng 40 Phật Tử Quỳ Lễ & 6 Đệm Quỳ VIP**:
   - 6 đệm quỳ gấm đỏ trên bục gỗ vinh danh Top 6 thí chủ điểm Công Đức cao nhất.
   - Đạo tràng 40 Phật tử quỳ lễ hai bên thảm đỏ theo phối cảnh 3D chiều sâu (5 hàng × 4 cột mỗi bên), tự động vái lạy theo làn sóng khi gõ mõ hoặc thỉnh chuông.
4. **Pháp Khí Tương Tác & Hiệu Ứng Âm Thanh Web Audio**:
   - 🪵 **Gõ Mõ**: Tích điểm công đức, âm thanh mõ gỗ tự nhiên sinh động.
   - 🔔 **Thỉnh Đại Hồng Chung**: Ngân vang chuông đồng kèm sóng âm vàng lan tỏa khắp màn hình.
   - 🎋 **Xin Xăm / Gieo Quẻ (Bộ 18 Quẻ Linh Xăm Chùa Thiên Sơn)**: Lắc ống xăm tre, hiển thị tờ Giải Quẻ (Thượng Thượng Cát, Đại Cát...) đồng bộ đúng lúc giọng đọc bắt đầu.
   - 🏮 **Thả Đèn Hoa Đăng**: Bình luận lời khấn bay lên trời thành đèn hoa đăng rực rỡ.
   - 🐉 **Đại Lễ Kim Long Chầu Phật**: Mưa hoa sen vàng, hào quang tỏa sáng khi tặng quà lớn (≥ 100 xu).
5. **Bộ Lọc Chống Spam & Kiểm Duyệt Ký Tự**:
   - Tự động lọc chữ Zalgo, Braille, Cuneiform (`𒐫`), bình luận rác hoặc từ ngữ phản cảm.
   - Chuẩn hóa Unicode tiếng Việt (`NFKC` -> `NFC`).
   - Cooldown 3.5 giây chống spam nghẽn hàng đợi giọng đọc.
6. **Bảng Điều Khiển Nhanh & Trang Quản Trị JSON-RPC 2.0 Admin**:
   - Thanh điều khiển bên cạnh: chỉnh âm lượng nhạc nền/giọng đọc, kích hoạt nhanh nghi thức, nhật ký trực tiếp.
   - Chế độ OBS 9:16 sạch (`?obs=1`).
   - Trang `/admin` (hoặc click `Mở Admin Đầy Đủ ↗`) kiểm tra lệnh RPC và thử giọng đọc trực tiếp.

---

## 🏗️ Cấu Trúc Dự Án

```text
├── src/
│   ├── Temple.Server/          # Backend C# ASP.NET Core (.NET 9)
│   │   ├── Controllers/        # Endpoints REST & JSON-RPC
│   │   ├── Models/             # Model Trạng thái, Sự kiện, Quẻ linh xăm, JSON-RPC 2.0
│   │   ├── Services/           # TempleService, TikTokService, TtsService, SimulationService
│   │   ├── WebSocket/          # JsonRpcWebSocketHandler quản lý kết nối thời gian thực
│   │   ├── Program.cs          # Cấu hình máy chủ, middleware, static files
│   │   └── Temple.Server.csproj
│   │
│   └── Temple.Client/          # Frontend ReactJS (Vite)
│       ├── public/assets/      # 12 file đồ họa Chánh điện & 8-frame Phật tử áo lam
│       ├── src/
│       │   ├── components/     # TempleStage (9:16), QuickDock, AdminPanel
│       │   ├── hooks/          # useTempleRpc (WebSocket JSON-RPC 2.0)
│       │   ├── utils/          # audio.js (Web Audio Pháp khí), particles.js (Canvas 30FPS)
│       │   ├── styles/         # live.css (Tối ưu hóa GPU Compositor)
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
│
├── data/
│   ├── merit-state.json        # Lưu trữ trạng thái bền vững điểm Công Đức
│   └── tts-cache/              # Bộ đệm file âm thanh
├── scripts/
│   ├── tiktok_bridge.js        # Cầu nối TikTok Live Connector
│   └── tts_worker.py           # Worker ZeroTTS
├── TempleRpc.sln               # Solution Visual Studio / .NET 9
├── start.bat                   # File khởi chạy 1-click cho Windows
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu hệ thống
- **.NET 9 SDK** (hoặc .NET 8)
- **Node.js** (`>= 18.0`)

### 2. Cài đặt thư viện Frontend
Mở terminal trong thư mục `src/Temple.Client`:
```bash
cd src/Temple.Client
npm install
```

### 3. Cài đặt thư viện cầu nối TikTok Live (Tùy chọn khi kết nối Live thật)
```bash
cd scripts
npm install
```

### 4. Khởi chạy hệ thống

**Cách 1: Sử dụng file `start.bat` (Khuyên dùng trên Windows)**
- Nhấp đúp chuột vào file `start.bat` ở thư mục gốc.

**Cách 2: Chạy từng phần bằng dòng lệnh**
- **Terminal 1 (Backend C#)**:
  ```bash
  cd src/Temple.Server
  dotnet run
  ```
  *(Máy chủ C# sẽ chạy tại `http://localhost:5000`)*

- **Terminal 2 (Frontend ReactJS)**:
  ```bash
  cd src/Temple.Client
  npm run dev
  ```
  *(Giao diện React sẽ chạy tại `http://localhost:5173`)*

---

## 📺 Các Đường Dẫn Truy Cập

| Đường dẫn | Mục đích |
| :--- | :--- |
| **`http://localhost:5173`** | Màn hình Chánh Điện 9:16 + Bảng điều khiển nhanh |
| **`http://localhost:5173/?obs=1`** | Màn hình OBS Studio Browser Source 9:16 sạch (Kích thước `1080×1920`) |
| **`http://localhost:5173/#admin`** | Bảng quản trị JSON-RPC 2.0 Admin & Thử Giọng TTS |
| **`http://localhost:5000/rpc`** | C# HTTP JSON-RPC 2.0 Endpoint (`POST`) |
| **`ws://localhost:5000/ws`** | C# WebSocket JSON-RPC 2.0 Endpoint |

---

## 🔌 Giao Thức JSON-RPC 2.0

Bạn có thể gọi trực tiếp từ **TikFinity**, **Streamer.bot**, Postman hoặc `curl`:

### 1. Thắp hương bái Phật
```bash
curl -X POST http://localhost:5000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "temple.burnIncense",
    "params": {
      "user": "Thí Chủ Minh Tâm",
      "count": 3,
      "wish": "Cầu gia đình bình an, vạn sự cát tường như ý"
    }
  }'
```

### 2. Xin xăm / Gieo quẻ đầu năm
```bash
curl -X POST http://localhost:5000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "temple.drawFortune",
    "params": {
      "user": "Thí Chủ Diệu Thiện",
      "topic": "Cầu tài lộc và gia đạo bình an"
    }
  }'
```

### Danh Sách Các Methods Hỗ Trợ:
- `temple.getState`: Lấy toàn bộ trạng thái Chánh Điện và bảng xếp hạng Công Đức.
- `temple.burnIncense`: Thắp nhang và bước lên đảnh lễ 3 lạy (`user`, `avatar`, `count`, `wish`).
- `temple.sendPrayer`: Thả đèn hoa đăng cầu nguyện bay lên trời (`user`, `wish`).
- `temple.drawFortune`: Lắc ống xăm và mở tờ giải quẻ (`user`, `topic`).
- `temple.strikeWoodenFish`: Gõ mõ tích công đức (`user`, `count`).
- `temple.ringBell`: Thỉnh Đại Hồng Chung ngân vang (`user`, `count`, `wish`).
- `temple.offerGift`: Dâng hoa sen vàng / mâm quả / đèn lưu ly (`user`, `giftType`, `coins`, `giftName`).
- `temple.grandCeremony`: Kích hoạt Đại Lễ Kim Long Chầu Phật (`user`, `coins`, `giftName`).
- `temple.comment`: Nhận diện bình luận tự động phân loại nghi thức.
- `temple.speak`: Đọc câu tùy chọn bằng giọng TTS.
- `temple.updateSettings`: Cập nhật âm lượng nhạc nền, giọng đọc, bật/tắt giả lập.
- `temple.resetMerit`: Đặt lại điểm công đức về ban đầu.
- `live.connect` / `live.disconnect`: Kết nối / ngắt kết nối phòng TikTok Live.
- `live.setAutoSim`: Bật / tắt chế độ tự động giả lập người xem dâng lễ.

