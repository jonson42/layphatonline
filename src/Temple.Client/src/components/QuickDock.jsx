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
    if (!tiktokInput.trim()) return;
    setConnecting(true);
    try {
      await callRpc('live.connect', { username: tiktokInput });
    } catch (err) {
      alert(`Lỗi kết nối TikTok: ${err.message}`);
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
        <div style={{ fontSize: '11px', color: '#cbb387', margin: '4px 0 10px 0', lineHeight: '1.4' }}>
          💡 <em>Mẹo: Khi mở đồng thời TikTok LIVE Studio trên cùng máy, hãy tắt <strong>Giọng Đọc</strong> hoặc <strong>Nhạc Nền</strong> tại tab này để chỉ có TikTok LIVE Studio phát tiếng ra stream (tránh bị phát 2 lần).</em>
        </div>
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
          <button
            className="dock-btn gold"
            onClick={handleConnectTikTok}
            disabled={connecting}
          >
            {connecting ? 'Đang nối...' : 'Kết Nối'}
          </button>
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
      </div>

      {/* 4. NHẬT KÝ GẦN NHẤT */}
      <div className="dock-section">
        <div className="dock-section-title">📜 Nhật Ký Tương Tác Gần Nhất</div>
        <div className="event-feed">
          {recentEvents.slice(0, 8).map((ev) => (
            <div key={ev.id} className="event-feed-item">
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

