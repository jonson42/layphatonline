import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import tutienBgImg from '../assets/tutien_bg.jpg';
import swordCultivatorImg from '../assets/cultivator_sword_flying.png';
import ascensionCultivatorImg from '../assets/cultivator_tribulation_ascension.png';

const AVATAR_COLORS = [
  '#00e5ff', '#a855f7', '#f59e0b', '#10b981',
  '#ec4899', '#3b82f6', '#8b5cf6', '#eab308'
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const CELESTIAL_QUOTES = [
  'Kiếm khí tung hoành ba vạn dặm! 🗡️✨',
  'Đa tạ đạo hữu đã trợ duyên linh khí! 🌸',
  'Ngự kiếm phi hành, tiêu dao tam giới! ☁️',
  'Một kiếm phá vạn pháp, tâm tĩnh đạo sinh! ⚡',
  'Linh khí dồi dào, độ kiếp sắp thành! 🌟',
  'Thiên lôi thối lui, đạo tâm bất diệt! 🔥'
];

export default function TuTienStage({ state, activeEvent, audio, callRpc, obsMode }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Trạng thái Ngự Kiếm
  const [swordX, setSwordX] = useState(250);
  const [swordY, setSwordY] = useState(820);
  const [swordDir, setSwordDir] = useState(1); // 1: sang phải, -1: sang trái
  const [swordDashing, setSwordDashing] = useState(false);
  const [swordSpeech, setSwordSpeech] = useState(null);
  const [swordPilot, setSwordPilot] = useState('Tiêu Dao Tử');

  // Trạng thái Độ Kiếp
  const [isTribulationBurst, setIsTribulationBurst] = useState(false);
  const [tribulationDonor, setTribulationDonor] = useState('Đại Đạo Chân Nhân');
  const [tribulationDonorAvatar, setTribulationDonorAvatar] = useState(null);
  const [lightningFlash, setLightningFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // Tiến độ Linh Khí Độ Kiếp
  const totalQi = useMemo(() => {
    const merit = state?.totalMerit || 0;
    const hearts = state?.totalHearts || 0;
    return (merit * 10) + (hearts * 5) + 12500;
  }, [state?.totalMerit, state?.totalHearts]);

  const targetQi = 100000;
  const qiPercent = Math.min(100, Math.floor((totalQi % targetQi) / (targetQi / 100)));

  // Top Hộ Đạo (Leaderboard)
  const topCultivators = useMemo(() => {
    const list = state?.leaderboard || [];
    return list.slice(0, 3);
  }, [state?.leaderboard]);

  // Quản lý chuyển động Ngự Kiếm phi hành lướt mây tuần tra
  useEffect(() => {
    let animId;
    let posX = 200;
    let posY = 820;
    let dir = 1;
    let angle = 0;

    const loop = () => {
      angle += 0.025;
      posX += 1.4 * dir;
      posY = 820 + Math.sin(angle) * 35;

      if (posX > 720) {
        dir = -1;
        setSwordDir(-1);
      } else if (posX < 80) {
        dir = 1;
        setSwordDir(1);
      }

      setSwordX(posX);
      setSwordY(posY);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Hiệu ứng Sấm Sét Lôi Kiếp lập lòe ngẫu nhiên
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        setLightningFlash(true);
        setTimeout(() => setLightningFlash(false), 220);
      }
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Kích hoạt Đại Lễ Độ Kiếp Phi Thăng
  const triggerGrandAscension = useCallback((donorName, avatarUrl) => {
    setTribulationDonor(donorName || 'Đại Đạo Tiên Quân');
    setTribulationDonorAvatar(avatarUrl || null);
    setIsTribulationBurst(true);
    setScreenShake(true);

    try {
      audio?.playBell?.(1.0);
    } catch (_) {}

    setTimeout(() => setScreenShake(false), 1200);
    setTimeout(() => setIsTribulationBurst(false), 6500);
  }, [audio]);

  // Kích hoạt Ngự Kiếm Tăng Tốc & Nói Câu Tiên Hiệp
  const triggerSwordBoost = useCallback((speakerName, customMsg) => {
    setSwordPilot(speakerName || 'Tiêu Dao Tử');
    setSwordDashing(true);
    const msg = customMsg || CELESTIAL_QUOTES[Math.floor(Math.random() * CELESTIAL_QUOTES.length)];
    setSwordSpeech(msg);

    try {
      audio?.playFish?.(0.9);
    } catch (_) {}

    setTimeout(() => setSwordDashing(false), 1800);
    setTimeout(() => setSwordSpeech(null), 4000);
  }, [audio]);

  // Lắng nghe activeEvent từ TikTok / RPC
  useEffect(() => {
    if (!activeEvent) return;

    if (activeEvent.type === 'offerGift' || activeEvent.coins >= 10 || activeEvent.type === 'grandCeremony') {
      triggerGrandAscension(activeEvent.user, activeEvent.avatar);
      triggerSwordBoost(activeEvent.user, `Cảm tạ @${activeEvent.user} đã hộ pháp độ kiếp! ⚡✨`);
    } else if (activeEvent.type === 'memberGreet' || activeEvent.type === 'member') {
      triggerSwordBoost(activeEvent.user, `Hoan nghênh đạo hữu @${activeEvent.user} gia nhập Tiên Môn! 🌸`);
    } else if (activeEvent.type === 'comment' || activeEvent.type === 'like') {
      if (Math.random() > 0.5) {
        triggerSwordBoost(activeEvent.user);
      }
    }
  }, [activeEvent, triggerGrandAscension, triggerSwordBoost]);

  // Canvas Hạt Linh Khí & Cánh Hoa Bay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1920;

    const particles = [];
    const count = 55;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.3) * 1.5,
        vy: (Math.random() * 0.8) + 0.6,
        size: Math.random() * 5 + 2,
        alpha: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.5 ? '255, 215, 0' : (Math.random() > 0.5 ? '0, 229, 255' : '236, 72, 153')
      });
    }

    let pAnim;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${p.color}, 0.8)`;
        ctx.fill();
      });

      pAnim = requestAnimationFrame(render);
    };

    pAnim = requestAnimationFrame(render);
    return () => cancelAnimationFrame(pAnim);
  }, []);

  // Tương tác chạm vào màn hình (thả tim / trợ duyên)
  const handleStageClick = (e) => {
    triggerSwordBoost('Đạo Hữu Hữu Duyên');
    if (callRpc) {
      callRpc('temple.strikeWoodenFish', { count: 1 }).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`tutien-stage-wrapper ${screenShake ? 'stage-shake-active' : ''}`}
      onClick={handleStageClick}
      style={{
        position: 'relative',
        width: '1080px',
        height: '1920px',
        overflow: 'hidden',
        backgroundImage: `url(${tutienBgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        userSelect: 'none',
        fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
      }}
    >
      {/* 1. LỚP CANVAS HẠT LINH KHÍ & HOA TIÊN */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 4
        }}
      />

      {/* 2. CHỚP SÁNG THIÊN LÔI TOÀN CẢNH */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: lightningFlash ? 'rgba(216, 180, 254, 0.28)' : 'transparent',
          pointerEvents: 'none',
          transition: 'background 0.15s ease-out',
          zIndex: 5
        }}
      />

      {/* 3. HEADER & BANNER TIÊN MÔN GÓC TRÊN */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          width: '90%'
        }}
      >
        {/* Tiêu đề Tiên Sơn */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(30, 10, 60, 0.85) 0%, rgba(10, 5, 25, 0.95) 100%)',
            border: '2px solid rgba(255, 215, 0, 0.65)',
            boxShadow: '0 0 25px rgba(255, 215, 0, 0.45), inset 0 0 15px rgba(168, 85, 247, 0.4)',
            borderRadius: '24px',
            padding: '12px 36px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 8px #ffd700)' }}>⚡</span>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 900,
              letterSpacing: '3px',
              background: 'linear-gradient(180deg, #fff8db 0%, #ffd700 50%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
            }}
          >
            Đỉnh Tiên Sơn • Ngự Kiếm Độ Kiếp
          </span>
          <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 8px #00e5ff)' }}>🗡️</span>
        </div>

        {/* Thanh Tiến Độ Linh Khí Độ Kiếp */}
        <div
          style={{
            width: '92%',
            background: 'rgba(15, 5, 30, 0.8)',
            border: '1.5px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '16px',
            padding: '8px 14px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#e9d5ff' }}>
            <span>⚡ TIẾN ĐỘ LINH KHÍ ĐỘ KIẾP</span>
            <span style={{ color: '#ffd700' }}>{totalQi.toLocaleString('vi-VN')} / {targetQi.toLocaleString('vi-VN')} ({qiPercent}%)</span>
          </div>
          <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${qiPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #a855f7 0%, #00e5ff 50%, #ffd700 100%)',
                boxShadow: '0 0 12px #00e5ff',
                borderRadius: '10px',
                transition: 'width 0.4s ease-out'
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. BẢNG VÀNG HỘ ĐẠO CHÂN QUÂN (TOP 3 LEADERBOARD) - GÓC TRÊN BÊN TRÁI */}
      <div
        style={{
          position: 'absolute',
          top: '160px',
          left: '30px',
          zIndex: 15,
          background: 'rgba(20, 10, 40, 0.85)',
          border: '1.5px solid rgba(255, 215, 0, 0.4)',
          borderRadius: '16px',
          padding: '10px 14px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '220px'
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffd700', letterSpacing: '1px' }}>
          👑 BẢNG VÀNG HỘ ĐẠO
        </div>
        {topCultivators.map((cultivator, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#fff' }}>
            <span style={{ fontWeight: 800, color: idx === 0 ? '#ffd700' : (idx === 1 ? '#e2e8f0' : '#d97706') }}>
              #{idx + 1}
            </span>
            <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {cultivator.name}
            </span>
            <span style={{ marginLeft: 'auto', color: '#6ee7b7', fontWeight: 700 }}>
              +{cultivator.merit}
            </span>
          </div>
        ))}
      </div>

      {/* 5. NHÂN VẬT ĐỘ KIẾP PHI THĂNG (TRUNG TÂM TẦNG CAO) */}
      <div
        style={{
          position: 'absolute',
          top: '320px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        {/* Đại Kim Quang Hộ Thể xoay tròn phía sau */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.45) 0%, rgba(168, 85, 247, 0.2) 60%, transparent 75%)',
            boxShadow: '0 0 60px rgba(255, 215, 0, 0.6), inset 0 0 40px rgba(255, 255, 255, 0.5)',
            animation: 'rotateHalo 22s linear infinite',
            zIndex: 1
          }}
        />

        {/* Tia sét thiên lôi xung quanh */}
        {lightningFlash && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              width: '420px',
              height: '520px',
              border: '2px dashed rgba(216, 180, 254, 0.8)',
              borderRadius: '50%',
              boxShadow: '0 0 35px #a855f7, inset 0 0 25px #00e5ff',
              zIndex: 2,
              animation: 'flashBolt 0.2s ease-in-out'
            }}
          />
        )}

        {/* Thẻ Đạo Hiệu Nhân Vật Độ Kiếp */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.95) 0%, rgba(180, 83, 9, 0.95) 100%)',
            border: '2px solid #fff',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
            borderRadius: '20px',
            padding: '6px 20px',
            color: '#1f0604',
            fontSize: '15px',
            fontWeight: 900,
            letterSpacing: '1px',
            zIndex: 12,
            marginBottom: '-15px'
          }}
        >
          ⚡ {tribulationDonor} • ĐỘ KIẾP PHI THĂNG ⚡
        </div>

        {/* Sprite Nhân Vật Độ Kiếp */}
        <img
          src={ascensionCultivatorImg}
          alt="Nhân vật Độ Kiếp"
          style={{
            width: '380px',
            height: 'auto',
            filter: 'drop-shadow(0 15px 30px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 25px rgba(168, 85, 247, 0.6))',
            animation: 'levitateAscension 4.5s ease-in-out infinite',
            zIndex: 10
          }}
        />
      </div>

      {/* 6. NHÂN VẬT NGỰ KIẾM PHI HÀNH (BAY LƯỢN TẦNG GIỮA) */}
      <div
        style={{
          position: 'absolute',
          top: `${swordY}px`,
          left: `${swordX}px`,
          transform: `scaleX(${swordDir}) rotate(${swordDir * 4}deg)`,
          transition: swordDashing ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.4s ease',
          zIndex: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        {/* Bóng thoại Tiên Hiệp của Ngự Kiếm */}
        {swordSpeech && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              marginBottom: '10px',
              background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
              border: '2px solid #00e5ff',
              boxShadow: '0 0 15px rgba(0, 229, 255, 0.7)',
              borderRadius: '16px',
              padding: '8px 16px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              transform: `scaleX(${swordDir})`,
              zIndex: 25
            }}
          >
            {swordSpeech}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '7px solid #00e5ff'
              }}
            />
          </div>
        )}

        {/* Thẻ tên người Ngự Kiếm */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.95) 0%, rgba(3, 105, 161, 0.95) 100%)',
            border: '1.5px solid #7dd3fc',
            boxShadow: '0 0 12px rgba(0, 229, 255, 0.8)',
            borderRadius: '14px',
            padding: '4px 14px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 800,
            marginBottom: '-10px',
            zIndex: 15,
            transform: `scaleX(${swordDir})`
          }}
        >
          🗡️ {swordPilot} • NGỰ KIẾM
        </div>

        {/* Sprite Ngự Kiếm */}
        <img
          src={swordCultivatorImg}
          alt="Nhân vật Ngự Kiếm"
          style={{
            width: '240px',
            height: 'auto',
            filter: 'drop-shadow(0 10px 20px rgba(0, 229, 255, 0.7)) drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))'
          }}
        />
      </div>

      {/* 7. POPUP ĐẠI LỄ ĐỘ KIẾP THÀNH CÔNG (BURST MODAL) */}
      {isTribulationBurst && (
        <div
          style={{
            position: 'absolute',
            top: '400px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            animation: 'burstAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(88, 28, 135, 0.95) 0%, rgba(30, 10, 60, 0.98) 100%)',
              border: '3px solid #ffd700',
              boxShadow: '0 0 50px rgba(255, 215, 0, 0.9), inset 0 0 30px rgba(168, 85, 247, 0.8)',
              borderRadius: '28px',
              padding: '24px 40px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '42px', filter: 'drop-shadow(0 0 15px #ffd700)' }}>
              ⚡ 👑 ⚡
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#ffd700',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))'
              }}
            >
              CỬU THIÊN THẦN LÔI • ĐỘ KIẾP THÀNH TIÊN!
            </div>
            <div style={{ fontSize: '18px', color: '#e9d5ff', fontWeight: 700 }}>
              Đại thí chủ <strong style={{ color: '#00e5ff' }}>@{tribulationDonor}</strong> vừa trợ duyên thần lực!
            </div>
            <div
              style={{
                background: 'rgba(255, 215, 0, 0.2)',
                border: '1px solid #ffd700',
                borderRadius: '14px',
                padding: '6px 20px',
                fontSize: '15px',
                color: '#fef08a',
                fontWeight: 700
              }}
            >
              Phước Báu Vô Lượng • Công Đức Tăng Trưởng
            </div>
          </div>
        </div>
      )}

      {/* 8. FOOTER: THANH TƯƠNG TÁC KÊU GỌI THẢ TIM HỘ PHÁP GÓC DƯỚI */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          zIndex: 25,
          background: 'linear-gradient(180deg, rgba(20, 10, 40, 0.9) 0%, rgba(10, 5, 25, 0.95) 100%)',
          border: '2px solid rgba(0, 229, 255, 0.6)',
          boxShadow: '0 0 25px rgba(0, 229, 255, 0.35)',
          borderRadius: '24px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              boxShadow: '0 0 15px #00e5ff'
            }}
          >
            🗡️
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
              CHẠM MÀN HÌNH / THẢ TIM HỘ ĐẠO
            </div>
            <div style={{ fontSize: '13px', color: '#67e8f9', fontWeight: 600 }}>
              Mỗi lượt tim & quà tặng giúp Đạo Hữu sớm ngày phi thăng! ✨
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, #ec4899 0%, #be185d 100%)',
            border: '1.5px solid #fbcfe8',
            boxShadow: '0 0 15px rgba(236, 72, 153, 0.6)',
            borderRadius: '16px',
            padding: '10px 20px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>❤️</span>
          <span>HỘ PHÁP</span>
        </div>
      </div>

      {/* 9. CSS KEYFRAMES CHO ANIMATIONS */}
      <style>{`
        @keyframes rotateHalo {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes levitateAscension {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-24px) scale(1.02); }
        }
        @keyframes flashBolt {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @keyframes burstAppear {
          0% { opacity: 0; transform: translateX(-50%) scale(0.6); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        .stage-shake-active {
          animation: stageShake 0.4s ease-in-out infinite;
        }
        @keyframes stageShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-4px, 4px); }
          75% { transform: translate(4px, -4px); }
        }
      `}</style>
    </div>
  );
}
