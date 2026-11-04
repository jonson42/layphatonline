import React, { useState } from 'react';

export default function AdminPanel({ state, callRpc, onCloseAdmin }) {
  const [ttUser, setTtUser] = useState(state?.tiktok?.username || 'tranyennhi0987');
  const [ttsText, setTtsText] = useState('Nam mô A Di Đà Phật. Chùa Thiên Sơn Online xin kính chào quý thí chủ thập phương.');
  const [ttsAudioUrl, setTtsAudioUrl] = useState('');
  const [loadingTts, setLoadingTts] = useState(false);

  const [rpcUser, setRpcUser] = useState('Đại Thí Chủ Minh Tâm');
  const [rpcWish, setRpcWish] = useState('Cầu cho gia quyến bình an, vạn sự cát tường');
  const [selectedMethod, setSelectedMethod] = useState('temple.burnIncense');
  const [customParams, setCustomParams] = useState('{\n  "count": 3\n}');
  const [rpcOutput, setRpcOutput] = useState('');
  const [adminYtInput, setAdminYtInput] = useState(() => state?.settings?.youtubeUrl || '');

  const [connecting, setConnecting] = useState(false);
  const [customComment, setCustomComment] = useState('');
  const [commentInterval, setCommentInterval] = useState(() => state?.settings?.autoCommentIntervalSeconds || 20);
  const [chatSample, setChatSample] = useState(null);
  const [loadingComment, setLoadingComment] = useState(false);

  const commenter = state?.commenter;

  // Tải câu mẫu LiveChatGenerator và trạng thái commenter
  const loadChatSample = async () => {
    try {
      const res = await callRpc('live.getChatSample');
      if (res) setChatSample(res);
    } catch (_) {}
  };

  React.useEffect(() => {
    loadChatSample();
  }, []);

  const handleStartCommenter = async () => {
    setLoadingComment(true);
    try {
      const res = await callRpc('live.startCommenter', { username: ttUser, headless: false });
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Commenter Error: ${e.message}`);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleStopCommenter = async () => {
    try {
      const res = await callRpc('live.stopCommenter');
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Commenter Error: ${e.message}`);
    }
  };

  const handleOpenLogin = async () => {
    try {
      const res = await callRpc('live.openLogin');
      setRpcOutput(JSON.stringify(res, null, 2));
      alert('Đã mở cửa sổ trình duyệt TikTok! Bạn vui lòng đăng nhập hoặc quét mã QR trên màn hình trình duyệt đó.');
    } catch (e) {
      setRpcOutput(`Login Error: ${e.message}`);
    }
  };

  const handleSendCustomComment = async () => {
    if (!customComment.trim()) return;
    setLoadingComment(true);
    try {
      const res = await callRpc('live.sendComment', { text: customComment.trim() });
      setRpcOutput(JSON.stringify(res, null, 2));
      if (res?.success) setCustomComment('');
      else if (res?.state?.lastError) alert(`Lỗi gửi: ${res.state.lastError}`);
    } catch (e) {
      setRpcOutput(`Send Error: ${e.message}`);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleSendCurrentGreeting = async () => {
    setLoadingComment(true);
    try {
      const res = await callRpc('live.sendGreeting', { text: rpcUser || 'Thí Chủ' });
      setRpcOutput(JSON.stringify(res, null, 2));
      loadChatSample();
    } catch (e) {
      setRpcOutput(`Greeting Error: ${e.message}`);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleToggleAutoComment = async () => {
    const cur = state?.settings?.autoCommentEnabled || false;
    try {
      const res = await callRpc('temple.updateSettings', { autoCommentEnabled: !cur });
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Settings Error: ${e.message}`);
    }
  };

  const handleSaveInterval = async () => {
    const val = parseInt(commentInterval, 10) || 20;
    try {
      const res = await callRpc('temple.updateSettings', { autoCommentIntervalSeconds: val });
      setRpcOutput(JSON.stringify(res, null, 2));
      alert(`Đã lưu thời gian giãn cách bình luận: ${val} giây`);
    } catch (e) {
      setRpcOutput(`Interval Error: ${e.message}`);
    }
  };

  const handleConnectLive = async () => {
    setConnecting(true);
    try {
      const res = await callRpc('live.connect', { username: ttUser });
      setRpcOutput(JSON.stringify(res, null, 2));
      if (!res?.connected && res?.lastError) {
        alert(`❌ ${res.lastError}`);
      }
    } catch (e) {
      setRpcOutput(`Error: ${e.message}`);
      alert(`Lỗi kết nối: ${e.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectLive = async () => {
    try {
      const res = await callRpc('live.disconnect');
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Error: ${e.message}`);
    }
  };

  const handleApplyAdminYoutube = async () => {
    if (!adminYtInput.trim()) return;
    try {
      const res = await callRpc('temple.updateSettings', { youtubeUrl: adminYtInput.trim() });
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Lỗi YouTube: ${e.message}`);
    }
  };

  const handleStopAdminYoutube = async () => {
    try {
      setAdminYtInput('');
      const res = await callRpc('temple.updateSettings', { youtubeUrl: null });
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Lỗi YouTube: ${e.message}`);
    }
  };

  const handleTestTts = async () => {
    setLoadingTts(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voice: 'maichi' })
      });
      const data = await res.json();
      setRpcOutput(JSON.stringify(data, null, 2));
      if (data.url) {
        setTtsAudioUrl(data.url);
      }
    } catch (e) {
      setRpcOutput(`TTS Error: ${e.message}`);
    } finally {
      setLoadingTts(false);
    }
  };

  const handleExecuteRpc = async () => {
    try {
      let params = {};
      try {
        params = JSON.parse(customParams || '{}');
      } catch (err) {
        alert(`JSON params không hợp lệ: ${err.message}`);
        return;
      }
      params.user = params.user || rpcUser;
      params.wish = params.wish || rpcWish;

      const res = await callRpc(selectedMethod, params);
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`RPC Error: ${e.message}`);
    }
  };

  const handleResetMerit = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ điểm Công Đức về 0?')) return;
    try {
      const res = await callRpc('temple.resetMerit');
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setRpcOutput(`Reset Error: ${e.message}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #330c08 0%, #100302 80%)',
      color: '#fff8eb',
      padding: '24px',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Top Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#210906',
          border: '1.5px solid rgba(244, 193, 80, 0.38)',
          borderRadius: '18px',
          padding: '18px 24px'
        }}>
          <div>
            <h1 style={{ fontFamily: 'Noto Serif, serif', fontSize: '24px', color: '#ffe694' }}>
              🪷 BẢNG ĐIỀU KHIỂN CHÙA ONLINE TIKTOK LIVE RPC (.NET 9 C# + REACTJS)
            </h1>
            <p style={{ fontSize: '14px', color: '#d6ba8a', marginTop: '4px' }}>
              Trạng thái Live: {state?.tiktok?.connected ? `✅ Đã kết nối @${state.tiktok.username}` : 'Chưa kết nối'} • Giọng đọc: ZeroTTS Mai Chi
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href="/?obs=1"
              target="_blank"
              rel="noreferrer"
              title="OBS Mode 1: Theo cấu hình trang Main tự động"
              style={{
                background: 'linear-gradient(180deg, #6b140e 0%, #3d0906 100%)',
                color: '#ffe694',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(244,193,80,0.38)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none'
              }}
            >
              📺 OBS 1 (Theo Main)
            </a>
            <a
              href="/?obs=2"
              target="_blank"
              rel="noreferrer"
              title="OBS Mode 2: Cố định chế độ Bố Thí"
              style={{
                background: 'linear-gradient(180deg, #1b382b 0%, #0c1d15 100%)',
                color: '#86efac',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(134,239,172,0.38)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none'
              }}
            >
              🙏 OBS 2 (Bố Thí)
            </a>
            <a
              href="/?obs=3"
              target="_blank"
              rel="noreferrer"
              title="OBS Mode 3: Cố định chế độ Phóng Sinh Chim"
              style={{
                background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1e33 100%)',
                color: '#93c5fd',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(147,197,253,0.38)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none'
              }}
            >
              🕊️ OBS 3 (Phóng Sinh)
            </a>
            <a
              href="/?obs=4"
              target="_blank"
              rel="noreferrer"
              title="OBS Mode 4: Cố định chế độ Xem Quẻ / Thầy Bói"
              style={{
                background: 'linear-gradient(180deg, #581c87 0%, #3b0764 100%)',
                color: '#f0abfc',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(240,171,252,0.38)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none'
              }}
            >
              🔮 OBS 4 (Xem Quẻ)
            </a>
            <button
              onClick={onCloseAdmin}
              style={{
                background: 'linear-gradient(180deg, #f4c150 0%, #c48312 100%)',
                color: '#1f0604',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #fff3b0',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🪷 Về Màn Hình Live
            </button>
          </div>
        </header>

        {/* Grid Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
          {/* Card 1: TikTok Live & TTS */}
          <section style={{
            background: '#210906',
            border: '1.5px solid rgba(244, 193, 80, 0.38)',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h2 style={{ fontSize: '18px', color: '#ffe694', borderBottom: '1px solid rgba(244,193,80,0.2)', paddingBottom: '10px' }}>
              📡 1. Kết Nối TikTok Live & Thử Giọng ZeroTTS (Mai Chi)
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={ttUser}
                onChange={(e) => setTtUser(e.target.value)}
                placeholder="Nhập @username TikTok..."
                style={{
                  flex: 1,
                  background: '#120403',
                  border: '1px solid rgba(244,193,80,0.38)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff8eb'
                }}
              />
              <button
                onClick={handleConnectLive}
                style={{
                  background: 'linear-gradient(180deg, #f4c150 0%, #c48312 100%)',
                  color: '#1f0604',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #fff3b0',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Kết Nối
              </button>
              <button
                onClick={handleDisconnectLive}
                style={{
                  background: '#3d0906',
                  color: '#ffe694',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(244,193,80,0.38)',
                  cursor: 'pointer'
                }}
              >
                Ngắt
              </button>
            </div>
            {state?.tiktok?.lastError && (
              <div style={{
                color: '#ff8585',
                fontSize: '13px',
                background: 'rgba(255, 60, 60, 0.15)',
                border: '1px solid rgba(255, 100, 100, 0.4)',
                borderRadius: '8px',
                padding: '10px 14px',
                lineHeight: '1.4'
              }}>
                ⚠️ <strong>Lỗi kết nối:</strong> {state.tiktok.lastError}
              </div>
            )}
            {state?.tiktok?.connected && (
              <div style={{
                color: '#a3ffb0',
                fontSize: '13px',
                background: 'rgba(50, 200, 80, 0.15)',
                border: '1px solid rgba(80, 255, 120, 0.4)',
                borderRadius: '8px',
                padding: '10px 14px'
              }}>
                ✅ <strong>Đã kết nối phòng Live:</strong> @{state.tiktok.username} ({state.tiktok.viewerCount || 0} mắt xem)
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="Nội dung cần đọc..."
                style={{
                  flex: 1,
                  background: '#120403',
                  border: '1px solid rgba(244,193,80,0.38)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff8eb'
                }}
              />
              <button
                onClick={handleTestTts}
                disabled={loadingTts}
                style={{
                  background: 'linear-gradient(180deg, #f4c150 0%, #c48312 100%)',
                  color: '#1f0604',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #fff3b0',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {loadingTts ? 'Đang đọc...' : '🎙️ Đọc Thử'}
              </button>
            </div>
            {ttsAudioUrl && (
              <audio src={ttsAudioUrl} controls autoPlay style={{ width: '100%', height: '38px', marginTop: '6px' }} />
            )}

            {/* Chuyển đổi chế độ phát Live */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffd54f' }}>
                🔄 Chọn Chế Độ Phát Live:
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => callRpc('temple.updateSettings', { mode: 'temple' })}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: (state?.settings?.mode === 'temple') ? '2px solid #ffd54f' : '1px solid rgba(255,255,255,0.15)',
                    background: (state?.settings?.mode === 'temple') ? 'linear-gradient(180deg, #d48806 0%, #ad6800 100%)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🪷 Đi Chùa
                </button>
                <button
                  onClick={() => callRpc('temple.updateSettings', { mode: 'phongsinh' })}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: (state?.settings?.mode === 'phongsinh') ? '2px solid #81d4fa' : '1px solid rgba(255,255,255,0.15)',
                    background: (state?.settings?.mode === 'phongsinh') ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🕊️ Phóng Sinh
                </button>
                <button
                  onClick={() => callRpc('temple.updateSettings', { mode: 'bothi' })}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: (state?.settings?.mode === 'bothi') ? '2px solid #ff9800' : '1px solid rgba(255,255,255,0.15)',
                    background: (state?.settings?.mode === 'bothi') ? 'linear-gradient(180deg, #f57c00 0%, #e65100 100%)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🍺 Bố Thí
                </button>
                <button
                  onClick={() => callRpc('temple.updateSettings', { mode: 'xinchu' })}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: (state?.settings?.mode === 'xinchu') ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                    background: (state?.settings?.mode === 'xinchu') ? 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🔮 Thầy Bói
                </button>
                
              </div>
            </div>

            {/* Nhạc nền YouTube */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(244,193,80,0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffe694' }}>▶️ Nhạc / Kinh Tụng từ YouTube:</span>
                {state?.settings?.youtubeUrl && (
                  <span style={{ fontSize: '12px', color: '#69f0ae' }}>● Đang phát</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={adminYtInput}
                  onChange={(e) => setAdminYtInput(e.target.value)}
                  placeholder="Dán link YouTube (https://www.youtube.com/watch?v=...)"
                  style={{
                    flex: 1,
                    background: '#120403',
                    border: '1px solid rgba(244,193,80,0.38)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#fff8eb'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyAdminYoutube()}
                />
                <button
                  onClick={handleApplyAdminYoutube}
                  style={{
                    background: 'linear-gradient(180deg, #f4c150 0%, #c48312 100%)',
                    color: '#1f0604',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #fff3b0',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {state?.settings?.youtubeUrl ? 'Đổi Nhạc' : 'Phát Nhạc'}
                </button>
                {state?.settings?.youtubeUrl && (
                  <button
                    onClick={handleStopAdminYoutube}
                    style={{
                      background: '#6b140e',
                      color: '#ffe694',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(244,193,80,0.38)',
                      cursor: 'pointer'
                    }}
                  >
                    Dừng
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Card 2: JSON-RPC 2.0 Dispatcher */}
          <section style={{
            background: '#210906',
            border: '1.5px solid rgba(244, 193, 80, 0.38)',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h2 style={{ fontSize: '18px', color: '#ffe694', borderBottom: '1px solid rgba(244,193,80,0.2)', paddingBottom: '10px' }}>
              🙏 2. Gửi Lệnh Tương Tác JSON-RPC 2.0
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={rpcUser}
                onChange={(e) => setRpcUser(e.target.value)}
                placeholder="Tên thí chủ..."
                style={{
                  flex: 1,
                  background: '#120403',
                  border: '1px solid rgba(244,193,80,0.38)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff8eb'
                }}
              />
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                style={{
                  flex: 1,
                  background: '#120403',
                  border: '1px solid rgba(244,193,80,0.38)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff8eb'
                }}
              >
                <option value="temple.burnIncense">temple.burnIncense (Thắp hương / Chào người vào)</option>
                <option value="temple.follow">temple.follow (Follow kênh)</option>
                <option value="temple.share">temple.share (Chia sẻ live)</option>
                <option value="temple.sendPrayer">temple.sendPrayer (Cầu nguyện / Hoa đăng)</option>
                <option value="temple.drawFortune">temple.drawFortune (Xin xăm / Gieo quẻ)</option>
                <option value="temple.strikeWoodenFish">temple.strikeWoodenFish (Gõ mõ)</option>
                <option value="temple.ringBell">temple.ringBell (Thỉnh chuông)</option>
                <option value="temple.offerGift">temple.offerGift (Dâng hoa sen/lễ vật)</option>
                <option value="temple.grandCeremony">temple.grandCeremony (Đại lễ Kim Long)</option>
                <option value="temple.getState">temple.getState (Lấy trạng thái)</option>
                <option value="temple.resetMerit">temple.resetMerit (Đặt lại công đức)</option>
              </select>
            </div>
            <textarea
              rows={3}
              value={customParams}
              onChange={(e) => setCustomParams(e.target.value)}
              placeholder="JSON Params..."
              style={{
                width: '100%',
                background: '#120403',
                border: '1px solid rgba(244,193,80,0.38)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#fff8eb',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleExecuteRpc}
                style={{
                  flex: 1,
                  background: 'linear-gradient(180deg, #f4c150 0%, #c48312 100%)',
                  color: '#1f0604',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #fff3b0',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Gửi Lệnh RPC
              </button>
              <button
                onClick={handleResetMerit}
                style={{
                  background: '#6b140e',
                  color: '#ffe694',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(244,193,80,0.38)',
                  cursor: 'pointer'
                }}
              >
                Đặt Lại Công Đức
              </button>
            </div>
          </section>

          {/* Card 3: Playwright Auto TikTok Commenter & LiveChatGenerator */}
          <section style={{
            gridColumn: '1 / -1',
            background: '#190604',
            border: '1.5px solid rgba(244, 193, 80, 0.45)',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(244,193,80,0.25)', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', color: '#ffe694', margin: 0 }}>
                🤖 3. Tự Động Bình Luận TikTok Live (Playwright AI Chat Greeting)
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: commenter?.running ? 'rgba(50, 200, 80, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: commenter?.running ? '#69f0ae' : '#aaa',
                  border: commenter?.running ? '1px solid #69f0ae' : '1px solid #555'
                }}>
                  {commenter?.running ? '🟢 Trình Duyệt Đang Mở' : '⚪ Trình Duyệt Đang Tắt'}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: commenter?.loggedIn ? 'rgba(50, 200, 80, 0.2)' : 'rgba(255, 180, 0, 0.2)',
                  color: commenter?.loggedIn ? '#69f0ae' : '#ffd54f',
                  border: commenter?.loggedIn ? '1px solid #69f0ae' : '1px solid #ffd54f'
                }}>
                  {commenter?.loggedIn ? '✅ Đã Đăng Nhập TikTok' : '⚠️ Chưa Đăng Nhập'}
                </span>
              </div>
            </div>

            {/* Trạng thái chi tiết */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: '1px solid rgba(244, 193, 80, 0.2)'
            }}>
              <div><strong>Trạng thái:</strong> <span style={{ color: '#ffe694' }}>{commenter?.statusMessage || 'Chưa khởi chạy'}</span></div>
              {commenter?.url && <div><strong>Phòng Live:</strong> <a href={commenter.url} target="_blank" rel="noreferrer" style={{ color: '#90caf9' }}>{commenter.url}</a></div>}
              {commenter?.lastComment && (
                <div><strong>Bình luận vừa gửi gần nhất:</strong> <span style={{ color: '#a7f3d0' }}>"{commenter.lastComment}"</span> lúc <span style={{ color: '#ffd54f' }}>{commenter.lastCommentTime}</span></div>
              )}
              {commenter?.lastError && (
                <div style={{ color: '#ff8a80' }}><strong>Lỗi:</strong> {commenter.lastError}</div>
              )}
            </div>

            {/* Xem trước câu chúc thời gian thực LiveChatGenerator */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(88, 28, 135, 0.3) 0%, rgba(33, 9, 6, 0.6) 100%)',
              border: '1px solid rgba(216, 180, 254, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0abfc' }}>
                  🕒 Bộ Sinh Lời Chúc Tự Động Theo Thời Điểm: <span style={{ color: '#ffd54f', textTransform: 'capitalize' }}>{chatSample?.timeOfDay || 'Hiện Tại'}</span>
                </span>
                <button
                  onClick={loadChatSample}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffe694',
                    border: '1px solid rgba(244, 193, 80, 0.3)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Đổi Câu Mẫu
                </button>
              </div>
              <div style={{ fontSize: '13px', color: '#e9d5ff' }}>
                • <strong>Câu chung cho phòng:</strong> <em>"{chatSample?.randomMessage || 'Đang tải...'}"</em>
              </div>
              <div style={{ fontSize: '13px', color: '#fed7aa' }}>
                • <strong>Chào mừng người mới vào:</strong> <em>"{chatSample?.memberGreeting || 'Đang tải...'}"</em>
              </div>
            </div>

            {/* Các nút điều khiển chính */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!commenter?.running ? (
                <button
                  onClick={handleStartCommenter}
                  disabled={loadingComment}
                  style={{
                    background: 'linear-gradient(180deg, #10b981 0%, #047857 100%)',
                    color: '#fff',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #6ee7b7',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🚀 Khởi Động Trình Duyệt Comment
                </button>
              ) : (
                <button
                  onClick={handleStopCommenter}
                  style={{
                    background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                    color: '#fff',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #fca5a5',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⏹️ Tắt Trình Duyệt Comment
                </button>
              )}

              <button
                onClick={handleOpenLogin}
                style={{
                  background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid #fde68a',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔑 Mở Trình Duyệt Đăng Nhập TikTok
              </button>

              <button
                onClick={handleSendCurrentGreeting}
                disabled={loadingComment || !commenter?.running}
                style={{
                  background: commenter?.running ? 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)' : '#444',
                  color: commenter?.running ? '#fff' : '#888',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: commenter?.running ? '1px solid #c4b5fd' : '1px solid #555',
                  fontWeight: 700,
                  cursor: commenter?.running ? 'pointer' : 'not-allowed'
                }}
              >
                💬 Gửi Thử Câu Chúc Thời Điểm Ngay
              </button>
            </div>

            {/* Thiết lập Tự Động Bình Luận & Cooldown */}
            <div style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              border: '1px solid rgba(244, 193, 80, 0.2)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#ffe694' }}>
                <input
                  type="checkbox"
                  checked={state?.settings?.autoCommentEnabled || false}
                  onChange={handleToggleAutoComment}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                />
                <span>Tự động gửi lời chúc khi có người mới vào phòng Live (Member Join)</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '13px', color: '#d6ba8a' }}>Giãn cách tối thiểu giữa 2 comment:</span>
                <input
                  type="number"
                  min={8}
                  max={300}
                  value={commentInterval}
                  onChange={(e) => setCommentInterval(e.target.value)}
                  style={{
                    width: '70px',
                    background: '#120403',
                    border: '1px solid rgba(244,193,80,0.38)',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    color: '#fff',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#d6ba8a' }}>giây</span>
                <button
                  onClick={handleSaveInterval}
                  style={{
                    background: '#3d0906',
                    color: '#ffe694',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(244,193,80,0.38)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  Lưu
                </button>
              </div>
            </div>

            {/* Gửi bình luận tùy chỉnh thủ công */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <input
                type="text"
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCustomComment()}
                placeholder="Nhập nội dung bình luận muốn gửi trực tiếp vào TikTok Live chat..."
                style={{
                  flex: 1,
                  background: '#120403',
                  border: '1px solid rgba(244,193,80,0.38)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff8eb'
                }}
              />
              <button
                onClick={handleSendCustomComment}
                disabled={loadingComment || !commenter?.running || !customComment.trim()}
                style={{
                  background: commenter?.running && customComment.trim() ? 'linear-gradient(180deg, #f4c150 0%, #c48312 100%)' : '#444',
                  color: commenter?.running && customComment.trim() ? '#1f0604' : '#888',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: commenter?.running && customComment.trim() ? '1px solid #fff3b0' : '1px solid #555',
                  fontWeight: 700,
                  cursor: commenter?.running && customComment.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Gửi Chat
              </button>
            </div>
          </section>
        </div>

        {/* Output Console */}
        <section style={{
          background: '#0b0202',
          border: '1px solid rgba(244, 193, 80, 0.25)',
          borderRadius: '14px',
          padding: '16px'
        }}>
          <h3 style={{ fontSize: '15px', color: '#ffe694', marginBottom: '8px' }}>
            📜 Kết quả phản hồi JSON-RPC / API
          </h3>
          <pre style={{
            color: '#9ef0c0',
            fontFamily: 'monospace',
            fontSize: '13px',
            maxHeight: '300px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {rpcOutput || '// Bấm nút Gửi Lệnh RPC hoặc Thử Giọng để xem kết quả tại đây'}
          </pre>
        </section>
      </div>
    </div>
  );
}

