import React, { useState, useEffect } from 'react';

export default function QuickDock({ state, audio, callRpc, onOpenAdmin }) {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const s = localStorage.getItem('temple_dock_tts');
    const init = s !== null ? s === 'true' : true;
    audio.ttsEnabled = init;
    return init;
  });
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVol, setMusicVol] = useState(65);
  const [ttsVol, setTtsVol] = useState(95);
  const [youtubeInput, setYoutubeInput] = useState(() => state?.settings?.youtubeUrl || '');

  const [tunnelUrl, setTunnelUrl] = useState('');
  const [copiedTunnel, setCopiedTunnel] = useState(false);

  const [tiktokInput, setTiktokInput] = useState('@thienkim20060402');
  const [connecting, setConnecting] = useState(false);

  const [devoteeName, setDevoteeName] = useState('Quỳnh_Finn');
  const [devoteeWish, setDevoteeWish] = useState('Cầu cho gia đình bình an, tài lộc hanh thông, vạn sự như ý');

  useEffect(() => {
    let timer;
    const fetchTunnel = async () => {
      try {
        const res = await fetch('/api/tunnel-url');
        const data = await res.json();
        if (data.ok && data.url) {
          setTunnelUrl(data.url);
        }
      } catch (_) {}
    };
    fetchTunnel();
    timer = setInterval(fetchTunnel, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyTunnel = () => {
    if (!tunnelUrl) return;
    try {
      navigator.clipboard.writeText(tunnelUrl);
    } catch (_) {}
    setCopiedTunnel(true);
    setTimeout(() => setCopiedTunnel(false), 2500);
  };

  const unlockAudio = () => {
    audio.ensureContext();
    setAudioUnlocked(true);
  };

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    audio.ttsEnabled = next;
    try { localStorage.setItem('temple_dock_tts', String(next)); } catch (_) {}
  };

  const toggleMusic = () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    audio.bgMusicEnabled = next;
    if (next) audio.resumeMusic();
    else audio.pauseMusic();
  };

  const handleMusicVol = (e) => {
    const val = Number(e.target.value);
    setMusicVol(val);
    audio.setMusicVolume(val / 100);
  };

  const handleTtsVol = (e) => {
    const val = Number(e.target.value);
    setTtsVol(val);
    audio.setTtsVolume(val / 100);
  };

  const handleApplyYoutube = async () => {
    const url = youtubeInput.trim();
    if (!url) return;
    // Kiểm tra định dạng link video YouTube
    const ok = audio.loadYouTube(url);
    if (!ok) {
      alert('⚠️ Vui lòng dán link video YouTube đầy đủ có ID video (Ví dụ: https://www.youtube.com/watch?v=...)');
      return;
    }
    // Đồng bộ về máy chủ & các client OBS / TikTok LIVE Studio khác
    try {
      await callRpc('temple.updateSettings', { youtubeUrl: url });
    } catch (err) {
      console.warn('[Sync YouTube]', err);
    }
  };

  const handleStopYoutube = async () => {
    setYoutubeInput('');
    audio.stopYouTube();
    try {
      await callRpc('temple.updateSettings', { youtubeUrl: null });
    } catch (err) {
      console.warn('[Sync YouTube]', err);
    }
  };

  const handleConnectTikTok = async () => {
    const target = (tiktokInput || '').trim();
    if (!target) {
      alert('Vui lòng nhập @username hoặc link tài khoản TikTok Live!');
      return;
    }
    setConnecting(true);
    try {
      const res = await callRpc('live.connect', { username: target });
      if (res?.connected) {
        alert(`✅ Đã kết nối thành công phòng Live TikTok của @${target}!`);
      } else if (res?.lastError) {
        alert(`⚠️ Thông báo kết nối TikTok:\n\n${res.lastError}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối TikTok: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectTikTok = async () => {
    setConnecting(true);
    try {
      await callRpc('live.disconnect', {});
      alert('Đã ngắt kết nối TikTok Live.');
    } catch (err) {
      alert(`Lỗi ngắt kết nối: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleAutoSim = async () => {
    const current = Boolean(state?.settings?.autoSim);
    await callRpc('live.setAutoSim', { enabled: !current });
  };

  const recentEvents = state?.recentEvents || [];

  return (
    <aside className="quick-dock" id="quickDock">
      <div className="dock-header">
        <div className="dock-title">🎛️ Điều Khiển Live & RPC</div>
        <button
          onClick={onOpenAdmin}
          className="dock-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-bright)' }}
        >
          Mở Admin Đầy Đủ ↗
        </button>
      </div>

      {/* CHỌN CHẾ ĐỘ PHÁT LIVE */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 215, 0, 0.35)',
        borderRadius: '12px',
        padding: '10px 12px',
        marginBottom: '14px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffd54f', marginBottom: '8px' }}>
          🔄 CHẾ ĐỘ PHÁT LIVE HIỆN TẠI:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          <button
            style={{
              padding: '10px 4px',
              borderRadius: '8px',
              border: (state?.settings?.mode === 'temple') ? '2px solid #ffd54f' : '1px solid rgba(255,255,255,0.15)',
              background: (state?.settings?.mode === 'temple') ? 'linear-gradient(180deg, #d48806 0%, #ad6800 100%)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              boxShadow: (state?.settings?.mode === 'temple') ? '0 0 10px rgba(255,213,79,0.4)' : 'none'
            }}
            onClick={() => callRpc('temple.updateSettings', { mode: 'temple' })}
          >
            🪷 Đi Chùa
          </button>
          <button
            style={{
              padding: '10px 4px',
              borderRadius: '8px',
              border: (state?.settings?.mode === 'phongsinh') ? '2px solid #81d4fa' : '1px solid rgba(255,255,255,0.15)',
              background: (state?.settings?.mode === 'phongsinh') ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              boxShadow: (state?.settings?.mode === 'phongsinh') ? '0 0 10px rgba(2,132,199,0.5)' : 'none'
            }}
            onClick={() => callRpc('temple.updateSettings', { mode: 'phongsinh' })}
          >
            🕊️ Phóng Sinh
          </button>
          <button
            style={{
              padding: '10px 4px',
              borderRadius: '8px',
              border: (state?.settings?.mode === 'bothi') ? '2px solid #ff9800' : '1px solid rgba(255,255,255,0.15)',
              background: (state?.settings?.mode === 'bothi') ? 'linear-gradient(180deg, #f57c00 0%, #e65100 100%)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              boxShadow: (state?.settings?.mode === 'bothi') ? '0 0 10px rgba(255,152,0,0.5)' : 'none'
            }}
            onClick={() => callRpc('temple.updateSettings', { mode: 'bothi' })}
          >
            🍺 Bố Thí
          </button>
          <button
            style={{
              padding: '10px 2px',
              borderRadius: '8px',
              border: (state?.settings?.mode === 'xinchu') ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
              background: (state?.settings?.mode === 'xinchu') ? 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              boxShadow: (state?.settings?.mode === 'xinchu') ? '0 0 10px rgba(245,158,11,0.5)' : 'none'
            }}
            onClick={() => callRpc('temple.updateSettings', { mode: 'xinchu' })}
          >
            📜 Xin Chữ
          </button>
          </div>
      </div>

      {/* LINK CLOUDFLARE TIKTOK LIVE STUDIO */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.16) 0%, rgba(139, 29, 0, 0.28) 100%)',
        border: '1px solid rgba(255, 183, 77, 0.45)',
        borderRadius: '12px',
        padding: '10px 14px',
        marginBottom: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffe082' }}>
            🌐 Link TikTok LIVE Studio (OBS):
          </span>
          {tunnelUrl && (
            <button
              onClick={handleCopyTunnel}
              style={{
                background: copiedTunnel ? '#2e7d32' : 'linear-gradient(180deg, #ffa726 0%, #fb8c00 100%)',
                color: '#1a0500',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {copiedTunnel ? '✅ Đã Copy' : '📋 Copy Link'}
            </button>
          )}
        </div>
        <div style={{
          fontSize: '11px',
          color: tunnelUrl ? '#fffde7' : '#ffcc80',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          background: 'rgba(0, 0, 0, 0.45)',
          padding: '6px 8px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {tunnelUrl || '⏳ Đang lấy link Cloudflare Tunnel...'}
        </div>
      </div>

      {/* 1. ÂM THANH */}
      <div className="dock-section">
        <div className="dock-section-title">🔊 Âm Thanh Chùa & Giọng Đọc Khấn</div>
        <button
          className={`dock-btn ${audioUnlocked ? 'active-toggle' : 'gold'}`}
          onClick={unlockAudio}
        >
          {audioUnlocked ? '✅ Âm Thanh Chùa Đã Sẵn Sàng' : '🔔 Bật Âm Thanh Chùa & Giọng Đọc'}
        </button>
        <div className="dock-grid-2">
          <button
            className={`dock-btn ${ttsEnabled ? 'active-toggle' : ''}`}
            onClick={toggleTts}
          >
            🎙️ Giọng Đọc: {ttsEnabled ? 'BẬT' : 'TẮT'}
          </button>
          <button
            className={`dock-btn ${musicEnabled ? 'active-toggle' : ''}`}
            onClick={toggleMusic}
          >
            🎵 Nhạc Nền: {musicEnabled ? 'BẬT' : 'TẮT'}
          </button>
        </div>
        {(state?.settings?.mode === 'bothi' || state?.settings?.mode === 'phongsinh' || state?.settings?.mode === 'xinchu') ? (
          <div style={{ fontSize: '11.5px', color: '#ffe082', background: 'rgba(255, 152, 0, 0.15)', border: '1px solid rgba(255, 183, 77, 0.35)', borderRadius: '8px', padding: '6px 10px', margin: '4px 0 10px 0' }}>
            🎵 <strong>Nhạc nền:</strong> <em>Playlist 22 bài Phật giáo không lời (NhacCuaTui)</em> {musicEnabled ? '🟢 Đang phát' : '⚪ Đã tắt'}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#cbb387', margin: '4px 0 10px 0', lineHeight: '1.4' }}>
            💡 <em>Mẹo: Khi mở đồng thời TikTok LIVE Studio trên cùng máy, hãy tắt <strong>Giọng Đọc</strong> hoặc <strong>Nhạc Nền</strong> tại tab này để chỉ có TikTok LIVE Studio phát tiếng ra stream (tránh bị phát 2 lần).</em>
          </div>
        )}
        <button
          className="dock-btn"
          style={{
            background: (!ttsEnabled && !musicEnabled) ? '#4a1510' : '#260a08',
            color: '#ffd54f',
            border: '1px dashed rgba(255, 213, 79, 0.6)',
            fontSize: '12px',
            padding: '8px 12px',
            marginBottom: '10px'
          }}
          onClick={() => {
            const next = !(!ttsEnabled && !musicEnabled);
            setTtsEnabled(!next);
            setMusicEnabled(!next);
            audio.ttsEnabled = !next;
            audio.bgMusicEnabled = !next;
            if (!next) {
              audio.resumeMusic();
            } else {
              audio.pauseMusic();
            }
            try {
              localStorage.setItem('temple_dock_tts', String(!next));
            } catch (_) {}
          }}
        >
          {(!ttsEnabled && !musicEnabled) ? '🔊 Bật Lại Tiếng Tab Này' : '🔇 Tắt Tiếng Tab Này (Dành Cho Máy Đang Bật TikTok Studio)'}
        </button>
        <div className="volume-control-row">
          <div className="volume-label-line">
            <span>🎵 Âm lượng Nhạc nền</span>
            <strong>{musicVol}%</strong>
          </div>
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="100"
            value={musicVol}
            onChange={handleMusicVol}
          />
        </div>
        <div className="volume-control-row">
          <div className="volume-label-line">
            <span>🎙️ Âm lượng Giọng đọc</span>
            <strong>{ttsVol}%</strong>
          </div>
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="100"
            value={ttsVol}
            onChange={handleTtsVol}
          />
        </div>

        {/* PHÁT NHẠC TỪ YOUTUBE */}
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(244, 193, 80, 0.2)' }}>
          <div className="volume-label-line" style={{ marginBottom: '6px' }}>
            <span>▶️ Nhạc / Kinh tụng từ YouTube:</span>
            {state?.settings?.youtubeUrl && (
              <span style={{ fontSize: '12px', color: '#69f0ae' }}>● Đang phát</span>
            )}
          </div>
          <div className="dock-input-row">
            <input
              type="text"
              className="dock-input"
              placeholder="Dán link YouTube tại đây..."
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyYoutube()}
            />
            <button
              className="dock-btn-action"
              onClick={handleApplyYoutube}
              style={{ minWidth: '70px', padding: '0 12px' }}
            >
              {state?.settings?.youtubeUrl ? 'Đổi' : 'Phát'}
            </button>
            {state?.settings?.youtubeUrl && (
              <button
                className="dock-btn-action"
                onClick={handleStopYoutube}
                style={{ minWidth: '60px', padding: '0 10px', background: '#d32f2f', color: '#fff' }}
              >
                Tắt
              </button>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#d4bc94', marginTop: '6px', lineHeight: '1.4' }}>
            💡 <em>Mẹo: Nếu đang mở đồng thời TikTok LIVE Studio trên cùng máy, hãy bấm tắt <strong>Nhạc Nền</strong> tại đây để tránh tiếng vọng phát trùng 2 lần.</em>
          </div>
        </div>
      </div>

      {/* 2. TIKTOK LIVE */}
      <div className="dock-section">
        <div className="dock-section-title">📡 Kết Nối Phòng TikTok Live</div>
        <div className="dock-input-row">
          <input
            type="text"
            className="dock-input"
            value={tiktokInput}
            onChange={(e) => setTiktokInput(e.target.value)}
            placeholder="Nhập @username hoặc link TikTok Live..."
          />
          {state?.tiktok?.connected ? (
            <button
              className="dock-btn red"
              onClick={handleDisconnectTikTok}
              disabled={connecting}
            >
              {connecting ? 'Đang xử lý...' : 'Ngắt Nối'}
            </button>
          ) : (
            <button
              className="dock-btn gold"
              onClick={handleConnectTikTok}
              disabled={connecting}
            >
              {connecting ? 'Đang nối...' : 'Kết Nối'}
            </button>
          )}
        </div>
        {state?.tiktok?.lastError && (
          <div style={{ color: '#ff8585', fontSize: '12px', background: 'rgba(255,60,60,0.15)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,100,100,0.3)', margin: '4px 0' }}>
            ⚠️ {state.tiktok.lastError}
          </div>
        )}
        {state?.tiktok?.connected && (
          <div style={{ color: '#a3ffb0', fontSize: '12px', background: 'rgba(50,200,80,0.15)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(80,255,120,0.3)', margin: '4px 0' }}>
            ✅ Đã nối phòng Live @{state.tiktok.username}!
          </div>
        )}
        <button
          className={`dock-btn ${state?.settings?.autoSim ? 'active-toggle' : ''}`}
          onClick={handleToggleAutoSim}
        >
          🤖 Tự động Giả lập Người Xem: {state?.settings?.autoSim ? 'ĐANG BẬT' : 'TẮT'}
        </button>
      </div>

      {/* 3. NGHI THỨC TƯƠNG TÁC */}
      <div className="dock-section">
        {state?.settings?.mode === 'phongsinh' ? (
          <>
            <div className="dock-section-title">🕊️ Kích Hoạt Phóng Sinh Chim (RPC)</div>
            <input
              type="text"
              className="dock-input"
              value={devoteeName}
              onChange={(e) => setDevoteeName(e.target.value)}
              placeholder="Tên người xem / Phật tử..."
            />
            <input
              type="text"
              className="dock-input"
              value={devoteeWish}
              onChange={(e) => setDevoteeWish(e.target.value)}
              placeholder="Lời cầu nguyện / Chúc phúc..."
            />

            <button
              className="dock-btn gold"
              style={{ marginBottom: '10px', fontSize: '13px', padding: '10px' }}
              onClick={() => {
                const name = devoteeName.trim() || 'Phật Tử Hữu Duyên';
                callRpc('temple.greetMember', {
                  user: name,
                  readTts: true
                });
              }}
            >
              👋 Thử Người Vào Live (Chào Mừng & Gửi Lời Chúc)
            </button>

            <button
              className="dock-btn"
              style={{
                marginBottom: '10px',
                fontSize: '13px',
                padding: '10px',
                background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                fontWeight: 800,
                border: '1.5px solid #81d4fa',
                boxShadow: '0 0 10px rgba(2, 132, 199, 0.4)'
              }}
              onClick={() => {
                const name = devoteeName.trim() || 'Phật Tử Hữu Duyên';
                callRpc('temple.releaseBirds', {
                  user: name,
                  count: 50,
                  readTts: true
                });
              }}
            >
              🕊️ Phóng Sinh 50 Chú Chim (Cảm Ơn)
            </button>

            <div className="dock-grid-2">
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.releaseBirds', { user: devoteeName, count: 20 })}
              >
                🕊️ Thả 20 Chim
              </button>
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.releaseBirds', { user: devoteeName, count: 100 })}
              >
                🕊️ Thả 100 Chim
              </button>
              <button
                className="dock-btn"
                style={{ background: 'linear-gradient(180deg, #e11d48 0%, #be123c 100%)', color: '#fff', border: '1px solid #fda4af' }}
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 15 })}
              >
                ❤️ Thả 15 Tim
              </button>
              <button
                className="dock-btn"
                style={{ background: 'linear-gradient(180deg, #e11d48 0%, #be123c 100%)', color: '#fff', border: '1px solid #fda4af' }}
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 50 })}
              >
                💖 Thả 50 Tim
              </button>
              <button
                className="dock-btn"
                style={{ background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', color: '#fff', border: '1.5px solid #a7f3d0' }}
                onClick={() => callRpc('temple.follow', { user: devoteeName })}
              >
                ➕ Bấm Follow Kênh
              </button>
              <button
                className="dock-btn"
                style={{ background: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff', border: '1.5px solid #7dd3fc' }}
                onClick={() => callRpc('temple.share', { user: devoteeName })}
              >
                🔄 Chia Sẻ Buổi Live
              </button>
            </div>
          </>
        ) : state?.settings?.mode === 'bothi' ? (
          <>
            <div className="dock-section-title">🍺 Kích Hoạt Tương Tác Bố Thí (RPC)</div>
            <input
              type="text"
              className="dock-input"
              value={devoteeName}
              onChange={(e) => setDevoteeName(e.target.value)}
              placeholder="Tên người xem / Mạnh thường quân..."
            />
            <input
              type="text"
              className="dock-input"
              value={devoteeWish}
              onChange={(e) => setDevoteeWish(e.target.value)}
              placeholder="Lời nhắn / Ghi chú..."
            />

            <button
              className="dock-btn gold"
              style={{ marginBottom: '10px', fontSize: '13px', padding: '10px' }}
              onClick={() => {
                const name = devoteeName.trim() || 'Bạn Hữu';
                const greeting = `Chào ${name}, nhờ anh chị cho em xin vài đồng, tim hoặc bấm follow để em có tiền đi uống bia.`;
                callRpc('temple.burnIncense', {
                  user: name,
                  wish: 'Nhờ anh/chị cho em xin vài đồng, tim hoặc follow để có tiền đi uống bia! 🍺🙏',
                  count: 1,
                  readTts: true,
                  customTts: greeting
                });
              }}
            >
              👋 Thử Người Vào Live (Chào & Xin Bia)
            </button>

            <button
              className="dock-btn"
              style={{
                marginBottom: '10px',
                fontSize: '13px',
                padding: '10px',
                background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontWeight: 800,
                border: '1.5px solid #a7f3d0',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
              }}
              onClick={() => {
                const name = devoteeName.trim() || 'Thí Chủ Hảo Tâm';
                callRpc('temple.follow', {
                  user: name,
                  readTts: true
                });
              }}
            >
              ➕ Thử Bấm Follow Kênh
            </button>

            <button
              className="dock-btn"
              style={{
                marginBottom: '10px',
                fontSize: '13px',
                padding: '10px',
                background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                fontWeight: 800,
                border: '1.5px solid #7dd3fc',
                boxShadow: '0 0 10px rgba(2, 132, 199, 0.4)'
              }}
              onClick={() => {
                const name = devoteeName.trim() || 'Thí Chủ Hảo Tâm';
                callRpc('temple.share', {
                  user: name,
                  readTts: true
                });
              }}
            >
              🔄 Thử Bấm Chia Sẻ Live
            </button>

            <div className="dock-grid-2">
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, coins: 5, giftName: '5 Đồng Tiền Lẻ' })}
              >
                🪙 Bố Thí 5 Đồng
              </button>
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, coins: 10, giftName: '10 Đồng Tiền Lẻ' })}
              >
                🪙 Bố Thí 10 Đồng
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, coins: 20, giftName: 'Ly Bia Hơi' })}
              >
                🍺 Tặng Ly Bia (+20đ)
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, coins: 100, giftName: 'Thùng Bia Sài Gòn' })}
              >
                🍻 Tặng Thùng Bia (+100đ)
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 20 })}
              >
                ❤️ Thả 20 Tim
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 50 })}
              >
                💖 Thả 50 Tim
              </button>
            </div>
            <button
              className="dock-btn gold"
              onClick={() => callRpc('temple.grandCeremony', { user: devoteeName, coins: 200, giftName: 'Đại Tiệc Bố Thí Bia' })}
            >
              🎉 Đại Lễ Bố Thí Tiền Uống Bia (200 Đồng)
            </button>
          </>
        ) : state?.settings?.mode === 'xinchu' ? (
          <>
            <div className="dock-section-title">📜 Kích Hoạt Xin Chữ Đầu Xuân (RPC)</div>
            <input
              type="text"
              className="dock-input"
              value={devoteeName}
              onChange={(e) => setDevoteeName(e.target.value)}
              placeholder="Tên thí chủ xin chữ..."
            />
            <input
              type="text"
              className="dock-input"
              value={devoteeWish}
              onChange={(e) => setDevoteeWish(e.target.value)}
              placeholder="Chữ muốn xin (PHÚC, LỘC, THỌ, AN, TÂM, TÀI...)"
            />

            <button
              className="dock-btn gold"
              style={{ marginBottom: '10px', fontSize: '13px', padding: '10px' }}
              onClick={() => {
                const name = devoteeName.trim() || 'Thí Chủ Hoan Hỷ';
                const word = devoteeWish.trim() || 'PHÚC';
                callRpc('temple.requestCalligraphy', {
                  user: name,
                  word: word,
                  readTts: true
                });
              }}
            >
              📜 Thầy Đồ Khai Bút Cho Chữ
            </button>

            <button
              className="dock-btn"
              style={{
                marginBottom: '10px',
                fontSize: '13px',
                padding: '10px',
                background: 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)',
                color: '#fff',
                fontWeight: 800,
                border: '1.5px solid #f59e0b',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'
              }}
              onClick={() => {
                const name = devoteeName.trim() || 'Thí Chủ Du Xuân';
                callRpc('temple.greetMember', {
                  user: name,
                  readTts: true
                });
              }}
            >
              🌸 Thử Người Vào Live (Chào Khách Xin Chữ)
            </button>

            <div className="dock-grid-2">
              <button
                className="dock-btn"
                style={{ background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800, border: '1.5px solid #a7f3d0' }}
                onClick={() => {
                  const name = devoteeName.trim() || 'Thí Chủ Du Xuân';
                  callRpc('temple.follow', { user: name, readTts: true });
                }}
              >
                ➕ Bấm Follow Kênh
              </button>
              <button
                className="dock-btn"
                style={{ background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)', color: '#fff', fontWeight: 800, border: '1.5px solid #7dd3fc' }}
                onClick={() => {
                  const name = devoteeName.trim() || 'Thí Chủ Du Xuân';
                  callRpc('temple.share', { user: name, readTts: true });
                }}
              >
                🔄 Chia Sẻ Live
              </button>
            </div>

            <div className="dock-grid-2" style={{ marginTop: '8px' }}>
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, coins: 10, giftName: '10 Đồng Gieo Duyên' })}
              >
                🪙 Gieo Duyên 10đ
              </button>
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, coins: 50, giftName: '50 Đồng Gieo Duyên' })}
              >
                🪙 Gieo Duyên 50đ
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 20 })}
              >
                ❤️ Thả 20 Tim
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 50 })}
              >
                💖 Thả 50 Tim
              </button>
            </div>

            <div className="dock-grid-2" style={{ marginTop: '8px' }}>
              <button
                className="dock-btn"
                style={{ background: '#7f1d1d', border: '1px solid #f59e0b', color: '#fef08a', fontWeight: 800 }}
                onClick={() => callRpc('temple.requestCalligraphy', { user: devoteeName, word: 'PHÚC', readTts: true })}
              >
                🧧 Chữ PHÚC
              </button>
              <button
                className="dock-btn"
                style={{ background: '#7f1d1d', border: '1px solid #f59e0b', color: '#fef08a', fontWeight: 800 }}
                onClick={() => callRpc('temple.requestCalligraphy', { user: devoteeName, word: 'LỘC', readTts: true })}
              >
                🧧 Chữ LỘC
              </button>
              <button
                className="dock-btn"
                style={{ background: '#7f1d1d', border: '1px solid #f59e0b', color: '#fef08a', fontWeight: 800 }}
                onClick={() => callRpc('temple.requestCalligraphy', { user: devoteeName, word: 'AN', readTts: true })}
              >
                🧧 Chữ AN
              </button>
              <button
                className="dock-btn"
                style={{ background: '#7f1d1d', border: '1px solid #f59e0b', color: '#fef08a', fontWeight: 800 }}
                onClick={() => callRpc('temple.requestCalligraphy', { user: devoteeName, word: 'TÀI', readTts: true })}
              >
                🧧 Chữ TÀI
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="dock-section-title">🙏 Kích Hoạt Nghi Thức Tương Tác (RPC)</div>
            <input
              type="text"
              className="dock-input"
              value={devoteeName}
              onChange={(e) => setDevoteeName(e.target.value)}
              placeholder="Tên người xem / Thí chủ..."
            />
            <input
              type="text"
              className="dock-input"
              value={devoteeWish}
              onChange={(e) => setDevoteeWish(e.target.value)}
              placeholder="Lời cầu nguyện..."
            />

            <button
              className="dock-btn gold"
              style={{ marginBottom: '10px', fontSize: '13px', padding: '10px' }}
              onClick={() => {
                const wishes = [
                  "Cầu cho gia đạo bình an, phúc lộc dồi dào, vạn sự cát tường",
                  "Cầu sức khỏe dồi dào, tâm an trí sáng, gia đình êm ấm",
                  "Cầu công danh sự nghiệp thuận buồm xuôi gió, hanh thông tấn tới",
                  "Cầu tài lộc hanh thông, tai qua nạn khỏi, sở nguyện tòng tâm"
                ];
                const w = wishes[Math.floor(Math.random() * wishes.length)];
                const name = devoteeName.trim() || 'Thí Chủ Hữu Duyên';
                const greeting = `Nam mô A Di Đà Phật. Chùa Thiên Sơn xin kính chào thí chủ ${name} đã vào Chánh Điện bái Phật. Nguyện cầu cho thí chủ ${w.toLowerCase()}.`;
                callRpc('temple.burnIncense', {
                  user: name,
                  wish: w,
                  count: 1,
                  readTts: true,
                  customTts: greeting
                });
              }}
            >
              👋 Thử Người Vào Chùa (Chào Tên & Chúc Phúc)
            </button>

            <div className="dock-grid-2">
              <button
                className="dock-btn gold"
                onClick={() => callRpc('temple.burnIncense', { user: devoteeName, wish: devoteeWish, count: 3 })}
              >
                🔥 Thắp 3 Nén Hương
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.sendPrayer', { user: devoteeName, wish: devoteeWish })}
              >
                🏮 Thả Đèn Hoa Đăng
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.strikeWoodenFish', { user: devoteeName, count: 5 })}
              >
                🪵 Gõ Mõ (+5)
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.ringBell', { user: devoteeName, wish: devoteeWish, count: 1, readTts: true })}
              >
                🔔 Thỉnh Chuông Chùa
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.drawFortune', { user: devoteeName, topic: devoteeWish })}
              >
                🎋 Xin Xăm / Gieo Quẻ
              </button>
              <button
                className="dock-btn"
                onClick={() => callRpc('temple.offerGift', { user: devoteeName, giftType: 'lotus', coins: 15 })}
              >
                🪷 Dâng Hoa Sen Vàng
              </button>
            </div>
            <button
              className="dock-btn gold"
              onClick={() => callRpc('temple.grandCeremony', { user: devoteeName, coins: 199 })}
            >
              🐉 Đại Lễ Kim Long Chầu Phật (Quà Lớn)
            </button>
          </>
        )}
      </div>

      {/* 4. NHẬT KÝ GẦN NHẤT */}
      <div className="dock-section">
        <div className="dock-section-title">📜 Nhật Ký Tương Tác Gần Nhất</div>
        <div className="event-feed">
          {recentEvents.slice(0, 8).map((ev) => (
            <div key={ev.id} className="event-feed-item">
              {ev.type === 'bothiGreet' && `👋 ${ev.user} vào live xin bia: “${ev.wish}”`}
              {ev.type === 'bothiFollow' && `➕ ${ev.user} đã follow kênh ủng hộ`}
              {ev.type === 'templeFollow' && `➕ ${ev.user} đã theo dõi đạo tràng`}
              {ev.type === 'bothiShare' && `🔄 ${ev.user} đã chia sẻ live giúp xin bia`}
              {ev.type === 'templeShare' && `🔄 ${ev.user} đã chia sẻ live đạo tràng`}
              {ev.type === 'bothiDonate' && `🪙 ${ev.user} bố thí ${ev.coins} đồng uống bia`}
              {ev.type === 'bothiHeart' && `❤️ ${ev.user} đã thả ${ev.count} tim`}
              {ev.type === 'burnIncense' && `🔥 ${ev.user} dâng ${ev.count} nén nhang (+${ev.merit} CĐ)`}
              {ev.type === 'strikeWoodenFish' && `🪵 ${ev.user} gõ mõ ${ev.count} nhịp (+${ev.merit} CĐ)`}
              {ev.type === 'ringBell' && `🔔 ${ev.user} thỉnh Đại Hồng Chung (+${ev.merit} CĐ)`}
              {ev.type === 'sendPrayer' && `🏮 ${ev.user} cầu phúc: “${ev.wish}”`}
              {(ev.type === 'offerGift' || ev.type === 'grandCeremony') && `🪷 ${ev.user} dâng ${ev.giftName} (+${ev.merit} CĐ)`}
              {ev.type === 'drawFortune' && `🎋 ${ev.user} gieo được Quẻ số ${ev.fortune?.number} (${ev.fortune?.rank})`}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

