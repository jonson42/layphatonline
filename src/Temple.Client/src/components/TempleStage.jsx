import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TempleParticleEngine } from '../utils/particles';

const VIP_CUSHION_COORDS = [
  { x: 140, y: 1188, rank: 1 },
  { x: 268, y: 1188, rank: 2 },
  { x: 392, y: 1188, rank: 3 },
  { x: 688, y: 1188, rank: 4 },
  { x: 812, y: 1188, rank: 5 },
  { x: 940, y: 1188, rank: 6 }
];

const HALL_SEAT_COORDS = [];
(function buildHallGrid() {
  const rows = 4;
  const colsPerSide = 4;
  for (let r = 0; r < rows; r++) {
    const progress = r / (rows - 1);
    const y = Math.round(1260 + progress * 260);
    const scale = +(0.78 + progress * 0.22).toFixed(2);

    const leftInnerX = Math.round(335 - progress * 48);
    const leftOuterX = 48;
    for (let c = 0; c < colsPerSide; c++) {
      const t = c / (colsPerSide - 1);
      const x = Math.round(leftOuterX + t * (leftInnerX - leftOuterX));
      HALL_SEAT_COORDS.push({ id: `L_${r}_${c}`, side: 'L', row: r, col: c, x, y, scale });
    }

    const rightInnerX = Math.round(745 + progress * 48);
    const rightOuterX = 1032;
    for (let c = 0; c < colsPerSide; c++) {
      const t = c / (colsPerSide - 1);
      const x = Math.round(rightInnerX + t * (rightOuterX - rightInnerX));
      HALL_SEAT_COORDS.push({ id: `R_${r}_${c}`, side: 'R', row: r, col: c, x, y, scale });
    }
  }
})();

export default function TempleStage({ state, activeEvent, audio, callRpc, obsMode }) {
  const stageWrapperRef = useRef(null);
  const stage9x16Ref = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef(null);
  const processedEventIdRef = useRef(null);

  // Worshipper pose & info state
  const [currentPose, setCurrentPose] = useState('kneel');
  const [isWalkingUp, setIsWalkingUp] = useState(false);
  const [centralInfo, setCentralInfo] = useState({
    name: 'Thí Chủ Minh Tâm',
    avatar: '',
    action: '✨ Dâng hương • +15 Công Đức',
    wish: 'Cầu gia đình bình an, vạn sự cát tường như ý'
  });

  // Effects & Modals state
  const [beamIntense, setBeamIntense] = useState(false);
  const [haloFlare, setHaloFlare] = useState(false);
  const [lanterns, setLanterns] = useState([]);
  const [fortuneModal, setFortuneModal] = useState({ visible: false, user: '', fortune: null });
  const [grandBanner, setGrandBanner] = useState({ visible: false, user: '', giftName: '', merit: 0 });
  const [incenseTips, setIncenseTips] = useState([]);
  const [hallBowing, setHallBowing] = useState({});

  const prostrationTimers = useRef([]);

  // 1. Auto-scaling 9:16 Stage
  const fitStage = useCallback(() => {
    if (!stageWrapperRef.current || !stage9x16Ref.current) return;
    const rect = stageWrapperRef.current.getBoundingClientRect();
    const scale = rect.width / 1080;
    stage9x16Ref.current.style.transform = `scale(${scale})`;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', fitStage);
    fitStage();
    return () => window.removeEventListener('resize', fitStage);
  }, [fitStage]);

  // 2. Initialize Particle Engine
  useEffect(() => {
    if (canvasRef.current) {
      const pe = new TempleParticleEngine(canvasRef.current);
      particlesRef.current = pe;
      return () => {
        pe.destroy();
      };
    }
  }, []);

  // 3. Incense Sticks Calculation
  const activeStickCount = state?.activeIncenseSticks || 9;
  useEffect(() => {
    const target = Math.max(3, Math.min(27, activeStickCount));
    const tips = [];
    const sticksData = [];

    for (let i = 0; i < target; i++) {
      const spread = target === 1 ? 0 : (i / (target - 1) - 0.5) * 2;
      const leftPx = 65 + spread * 28 + Math.sin(i * 2.1) * 2;
      const angleDeg = spread * 12 + Math.cos(i * 1.5) * 1.5;
      const heightPx = 76 + (i % 3) * 6;

      const rad = (angleDeg * Math.PI) / 180;
      const tipX = 540 + (leftPx - 65) + Math.sin(rad) * heightPx;
      const tipY = 895 - Math.cos(rad) * heightPx;
      tips.push({ x: tipX, y: tipY });

      sticksData.push({
        id: i,
        left: leftPx,
        height: heightPx,
        angle: angleDeg,
        delay: (i * 0.15) % 1.1
      });
    }

    setIncenseTips(sticksData);
    if (particlesRef.current) {
      particlesRef.current.setIncenseTips(tips);
    }
  }, [activeStickCount]);

  // 4. Prostration Animation Sequence
  const clearProstrationTimers = () => {
    prostrationTimers.current.forEach(clearTimeout);
    prostrationTimers.current = [];
  };

  const schedulePose = (ms, pose) => {
    prostrationTimers.current.push(
      setTimeout(() => setCurrentPose(pose), ms)
    );
  };

  const playThreeBowsSequence = (startDelay = 0) => {
    schedulePose(startDelay, 'kneelDown');
    schedulePose(startDelay + 160, 'kneel');

    const bowOffsets = [startDelay + 320, startDelay + 1820, startDelay + 3320];
    bowOffsets.forEach((t0) => {
      schedulePose(t0, 'forehead');
      schedulePose(t0 + 170, 'bowMid');
      schedulePose(t0 + 330, 'prostrate');
      schedulePose(t0 + 490, 'prostrateDeep');
      schedulePose(t0 + 860, 'prostrate');
      schedulePose(t0 + 1020, 'bowMid');
      schedulePose(t0 + 1180, 'kneel');
    });

    schedulePose(startDelay + 4800, 'forehead');
    schedulePose(startDelay + 5350, 'kneel');
  };

  const animateWalkerOnCarpet = (user, avatar, actionLabel, wish) => {
    clearProstrationTimers();
    setCentralInfo({
      name: user || 'Thí Chủ Hữu Duyên',
      avatar: avatar || '',
      action: actionLabel || '✨ Dâng hương cầu an',
      wish: wish || 'Nam Mô A Di Đà Phật, cầu bình an cát tường'
    });

    setIsWalkingUp(true);
    setCurrentPose('walk1');

    for (let step = 1; step <= 10; step++) {
      schedulePose(step * 185, step % 2 === 0 ? 'walk1' : 'walk2');
    }

    prostrationTimers.current.push(
      setTimeout(() => {
        setIsWalkingUp(false);
      }, 2100)
    );

    playThreeBowsSequence(2050);

    setBeamIntense(true);
    setTimeout(() => setBeamIntense(false), 4500);
    setHaloFlare(true);
    setTimeout(() => setHaloFlare(false), 3600);
  };

  const pulseHallBowing = () => {
    const newBowing = {};
    HALL_SEAT_COORDS.forEach((seat, i) => {
      if (i % 4 === 0) {
        newBowing[seat.id] = true;
        setTimeout(() => {
          setHallBowing((prev) => ({ ...prev, [seat.id]: false }));
        }, 1200);
      }
    });
    setHallBowing(newBowing);
  };

  const spawnSkyLantern = (user, wish) => {
    const id = Date.now() + Math.random();
    const left = 80 + Math.floor(Math.random() * 640);
    setLanterns((prev) => [...prev, { id, user, wish, left }]);
    setTimeout(() => {
      setLanterns((prev) => prev.filter((l) => l.id !== id));
    }, 10600);
  };

  // 5. React to incoming activeEvent
  useEffect(() => {
    if (!activeEvent) return;
    const ev = activeEvent;
    if (ev.id) {
      if (processedEventIdRef.current === ev.id) {
        return; // Sự kiện này đã được xử lý rồi, ngăn chặn tuyệt đối việc chạy lặp 2 lần
      }
      processedEventIdRef.current = ev.id;
    }
    const pe = particlesRef.current;

    if (ev.ttsText && ev.type !== 'drawFortune') {
      audio.enqueueTts(ev.ttsText, { voice: ev.ttsVoice || 'maichi' });
    }

    switch (ev.type) {
      case 'burnIncense':
        audio.playIncenseChime();
        if (pe) {
          pe.spawnIncenseBurst(540, 895);
          pe.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 860, '#ffe082');
        }
        const isJoining = ev.wish && (ev.wish.includes('Chánh Điện') || ev.wish.includes('vào phòng'));
        const actionLabel = isJoining
          ? '🌸 Đã vào Chánh Điện bái Phật'
          : `🔥 Dâng ${ev.count} nén hương (+${ev.merit} CĐ)`;
        const wishLabel = isJoining
          ? `Kính chào thí chủ ${ev.user} đến chiêm bái Phật quang`
          : ev.wish;
        animateWalkerOnCarpet(ev.user, ev.avatar, actionLabel, wishLabel);
        break;

      case 'strikeWoodenFish':
        audio.playWoodenFish();
        pulseHallBowing();
        if (pe) pe.spawnFloatingMerit(`+${ev.merit} Công Đức`, 890, 935, '#ffd54f');
        break;

      case 'ringBell':
        audio.playTempleBell(1.0);
        pulseHallBowing();
        if (pe) {
          pe.spawnBellWave(540, 510, 4);
          pe.spawnFloatingMerit(`+${ev.merit} Công Đức`, 190, 935, '#fff3b0');
        }
        setCentralInfo({
          name: ev.user,
          avatar: ev.avatar,
          action: `🔔 Thỉnh Đại Hồng Chung (+${ev.merit} CĐ)`,
          wish: ev.wish
        });
        clearProstrationTimers();
        playThreeBowsSequence(0);
        break;

      case 'sendPrayer':
        audio.playIncenseChime();
        spawnSkyLantern(ev.user, ev.wish);
        if (pe) pe.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 920, '#ffb74d');
        animateWalkerOnCarpet(ev.user, ev.avatar, `🏮 Cầu phúc (+${ev.merit} CĐ)`, ev.wish);
        break;

      case 'offerGift':
        audio.playIncenseChime();
        audio.playTempleBell(0.85);
        if (pe) {
          pe.spawnIncenseBurst(540, 895);
          pe.spawnFloatingMerit(`+${ev.merit} Công Đức`, 540, 840, '#fff3b0');
        }
        animateWalkerOnCarpet(ev.user, ev.avatar, `🪷 Dâng ${ev.giftName} (+${ev.merit} CĐ)`, ev.wish);
        break;

      case 'grandCeremony':
        audio.playTempleBell(1.2);
        setTimeout(() => audio.playTempleBell(1.1), 900);
        if (pe) pe.spawnGrandCeremonyRain();
        pulseHallBowing();
        setGrandBanner({ visible: true, user: ev.user, giftName: ev.giftName, merit: ev.merit });
        setTimeout(() => setGrandBanner((prev) => ({ ...prev, visible: false })), 6800);
        animateWalkerOnCarpet(ev.user, ev.avatar, `🐉 ${ev.giftName} (+${ev.merit} CĐ)`, ev.wish);
        break;

      case 'drawFortune':
        audio.playFortuneShake();
        setCentralInfo({
          name: ev.user,
          avatar: ev.avatar,
          action: '🎋 Đang xin xăm...',
          wish: `Thí chủ ${ev.user} đang thành tâm xin quẻ...`
        });
        audio.enqueueTts(ev.ttsText || '', {
          voice: ev.ttsVoice || 'maichi',
          onStart: () => {
            audio.playIncenseChime();
            setFortuneModal({ visible: true, user: ev.user, fortune: ev.fortune });
            setCentralInfo({
              name: ev.user,
              avatar: ev.avatar,
              action: `🎋 Quẻ số ${ev.fortune?.number} (${ev.fortune?.rank})`,
              wish: ev.fortune?.meaning || ''
            });
            clearProstrationTimers();
            playThreeBowsSequence(0);
          },
          onEnd: () => {
            setTimeout(() => setFortuneModal((prev) => ({ ...prev, visible: false })), 3000);
          }
        });
        break;
    }
  }, [activeEvent, audio]);

  const leaderboard = state?.leaderboard || [];
  const topDevotees = leaderboard.slice(0, 4);

  return (
    <div className={`stage-wrapper ${obsMode ? 'obs-mode' : ''}`} ref={stageWrapperRef}>
      <div className="stage-9x16" ref={stage9x16Ref}>
        {/* 1. HÌNH NỀN CHÁNH ĐIỆN ĐỨC PHẬT A DI ĐÀ */}
        <img
          src="/assets/amitabha_stage.png"
          alt="Đức Phật A Di Đà"
          className="sanctuary-bg-img"
          onError={(e) => {
            e.currentTarget.src = '/assets/amitabha_stage.jpg';
          }}
        />

        {/* 1B. HỆ THỐNG HÀO QUANG */}
        <div className={`buddha-halo-system ${haloFlare ? 'flare' : ''}`}>
          <div className="halo-sunburst" />
          <div className="halo-pulse-ring ring-1" />
          <div className="halo-pulse-ring ring-2" />
          <svg className="halo-dharma-svg" viewBox="0 0 680 680">
            <g className="dharma-wheel-outer" stroke="#fff2a6" fill="none">
              <circle cx="340" cy="340" r="295" strokeWidth="2.2" strokeDasharray="14 10" strokeOpacity="0.78" />
              <circle cx="340" cy="340" r="252" strokeWidth="1.8" strokeDasharray="6 8" strokeOpacity="0.65" />
              <circle cx="340" cy="340" r="210" strokeWidth="2.5" strokeOpacity="0.7" />
            </g>
            <g className="dharma-wheel-inner" stroke="#ffe47a" fill="none">
              <circle cx="340" cy="340" r="168" strokeWidth="2.2" strokeDasharray="20 12" strokeOpacity="0.85" />
              <circle cx="340" cy="340" r="134" strokeWidth="1.6" strokeOpacity="0.65" />
            </g>
          </svg>
        </div>

        {/* HÀO QUANG ĐÀI SEN TRÊN TAY PHẬT */}
        <div className={`lotus-hand-halo ${haloFlare ? 'flare' : ''}`} />

        {/* 2. THANH TRẠNG THÁI MỎNG TRÊN ĐỈNH */}
        <header className="minimal-top-bar">
          <div className="live-pill">
            <span className={`live-dot ${state?.tiktok?.connected ? 'connected' : ''}`} />
            <span>
              {state?.tiktok?.connected
                ? `LIVE @${state.tiktok.username} • ${state.tiktok.viewerCount || 0} mắt`
                : state?.settings?.autoSim
                ? 'CHÙA THIÊN SƠN • TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI'
                : 'CHÙA THIÊN SƠN • ĐỨC PHẬT A DI ĐÀ'}
            </span>
          </div>
          <div className="top-Right-badges">
            <div className="mini-stat-pill">
              🔥 <strong>{(state?.totalIncense || 108).toLocaleString('vi-VN')}</strong> hương • ✨ <strong>{(state?.totalMerit || 1080).toLocaleString('vi-VN')}</strong> CĐ
            </div>
          </div>
        </header>

        {/* 3. CỘT SÁNG TÂM HƯƠNG & LƯ HƯƠNG */}
        <div className={`sacred-light-beam ${beamIntense ? 'intense' : ''}`} />

        <div
          className="incense-burner-zone"
          title="Bấm để Thắp Hương Dâng Phật"
          onClick={() => callRpc('temple.burnIncense', { user: centralInfo.name, count: 3 })}
        >
          <div className="incense-sticks-holder">
            {incenseTips.map((stick) => (
              <div
                key={stick.id}
                className="incense-stick"
                style={{
                  left: `${stick.left}px`,
                  height: `${stick.height}px`,
                  transform: `rotate(${stick.angle}deg)`
                }}
              >
                <div
                  className="incense-ember"
                  style={{ animationDelay: `${stick.delay}s` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* PHÁP KHÍ TƯƠNG TÁC */}
        <div
          className="ritual-hotspot bell-hotspot"
          title="Bấm để Thỉnh Đại Hồng Chung"
          onClick={() => callRpc('temple.ringBell', { user: centralInfo.name, count: 1, readTts: true })}
        >
          <span className="hotspot-icon">🔔</span>
          <span className="hotspot-label">Thỉnh Chuông</span>
        </div>

        <div
          className="ritual-hotspot woodfish-hotspot"
          title="Bấm để Gõ Mõ Tích Công Đức"
          onClick={() => callRpc('temple.strikeWoodenFish', { user: centralInfo.name, count: 3 })}
        >
          <span className="hotspot-icon">🪵</span>
          <span className="hotspot-label">Gõ Mõ ({(state?.woodenFishHits || 360).toLocaleString('vi-VN')})</span>
        </div>

        <div
          className="ritual-hotspot fortune-hotspot"
          title="Bấm để Xin Xăm / Gieo Quẻ"
          onClick={() => callRpc('temple.drawFortune', { user: centralInfo.name, topic: centralInfo.wish })}
        >
          <span className="hotspot-icon">🎋</span>
          <span className="hotspot-label">Xin Xăm</span>
        </div>

        {/* 4. CHỦ LỄ ĐANG DÂNG HƯƠNG / QUỲ ĐẢNH LỄ */}
        <div className={`central-worshipper ${isWalkingUp ? 'walking-up' : ''}`}>
          <div className="worshipper-wish-bubble">
            “{centralInfo.wish}”
          </div>
          <div className="central-sprite-stack">
            <img src="/assets/devotee_walk.png" data-pose="walk1" className={`devotee-sprite pose-frame ${currentPose === 'walk1' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee_walk_2.png" data-pose="walk2" className={`devotee-sprite pose-frame ${currentPose === 'walk2' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee_kneel_down.png" data-pose="kneelDown" className={`devotee-sprite pose-frame ${currentPose === 'kneelDown' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee.png" data-pose="kneel" className={`devotee-sprite pose-frame ${currentPose === 'kneel' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee_bow.png" data-pose="forehead" className={`devotee-sprite pose-frame ${currentPose === 'forehead' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee_bow_mid.png" data-pose="bowMid" className={`devotee-sprite pose-frame ${currentPose === 'bowMid' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee_prostrate.png" data-pose="prostrate" className={`devotee-sprite pose-frame ${currentPose === 'prostrate' ? 'active' : ''}`} alt="" />
            <img src="/assets/devotee_prostrate_deep.png" data-pose="prostrateDeep" className={`devotee-sprite pose-frame ${currentPose === 'prostrateDeep' ? 'active' : ''}`} alt="" />
          </div>
          <div className="name-tag central-name-tag">
            <div className="tag-avatar">
              {centralInfo.avatar ? (
                <img src={centralInfo.avatar} alt="" />
              ) : (
                centralInfo.name.charAt(0).toUpperCase() || '🙏'
              )}
            </div>
            <div className="tag-texts">
              <div className="tag-name">{centralInfo.name}</div>
              <div className="tag-sub">{centralInfo.action}</div>
            </div>
          </div>
        </div>

        {/* 5. HÀNG 6 ĐỆM QUỲ VIP */}
        <div className="vip-cushions-layer">
          {VIP_CUSHION_COORDS.map((slot, idx) => {
            const dev = leaderboard[idx];
            if (!dev) return null;
            return (
              <div
                key={slot.rank}
                className="vip-devotee-slot"
                style={{ left: `${slot.x}px`, top: `${slot.y}px`, zIndex: 12 + idx }}
              >
                <img src="/assets/devotee.png" alt="VIP" className="devotee-sprite" />
                <div className="vip-rank-pill">
                  <span className="vip-rank-num">{slot.rank}</span>
                  <span className="vip-rank-name">{dev.name.length > 12 ? dev.name.slice(0, 12) + '...' : dev.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. ĐẠO TRÀNG 40 PHẬT TỬ QUỲ LỄ HAI BÊN */}
        <div className="congregation-hall">
          {HALL_SEAT_COORDS.map((seat, i) => {
            const dev = leaderboard[6 + i];
            const isBowing = hallBowing[seat.id];
            return (
              <div
                key={seat.id}
                className="hall-seat"
                style={{
                  left: `${seat.x}px`,
                  top: `${seat.y}px`,
                  zIndex: 20 + seat.row * 2 + (seat.col % 2),
                  transform: `translate3d(-50%, -100%, 0) scale(${seat.scale})`
                }}
              >
                <img
                  src={isBowing ? '/assets/devotee_prostrate_deep.png' : '/assets/devotee.png'}
                  alt=""
                  className="devotee-sprite"
                />
                <div className="hall-name-pill">
                  {dev ? (dev.name.length > 9 ? dev.name.slice(0, 9) + '..' : dev.name) : 'Phật tử'}
                </div>
              </div>
            );
          })}
        </div>

        {/* 8. ĐÈN HOA ĐĂNG BAY LÊN */}
        <div className="sky-lanterns-layer">
          {lanterns.map((l) => (
            <div key={l.id} className="sky-lantern" style={{ left: `${l.left}px` }}>
              <div className="sky-lantern-user">🙏 {l.user}</div>
              <div className="sky-lantern-wish">“{l.wish}”</div>
            </div>
          ))}
        </div>

        {/* 9. CANVAS HIỆU ỨNG KHÓI HƯƠNG, HOA SEN, SÓNG ÂM */}
        <canvas id="templeCanvas" ref={canvasRef} />

        {/* 10. THANH HUD GỌN GÀNG DƯỚI ĐÁY */}
        <footer className="bottom-hud-bar">
          <div className="hud-left-col">
            <div className="hud-active-notice">
              <span className="flower-bullet">💮</span>
              <strong>{centralInfo.name}</strong>
              <span>—</span>
              <span>{centralInfo.action}</span>
              <span className="flower-bullet">💮</span>
            </div>

            <div className="hud-gift-cards">
              <div
                className="hud-gift-card"
                title="Bấm để Dâng hương"
                onClick={() => callRpc('temple.burnIncense', { user: centralInfo.name, count: 3 })}
              >
                <div className="gift-coin-tag">1 COIN / CMT</div>
                <div className="gift-card-body">
                  <span className="gift-emoji">🔥</span>
                  <span className="gift-title">Dâng hương</span>
                </div>
              </div>

              <div
                className="hud-gift-card"
                title="Bấm để Cầu phúc & Thả hoa đăng"
                onClick={() => callRpc('temple.sendPrayer', { user: centralInfo.name, wish: centralInfo.wish })}
              >
                <div className="gift-coin-tag">5 COINS / TIM</div>
                <div className="gift-card-body">
                  <span className="gift-emoji">🏮</span>
                  <span className="gift-title">Cầu phúc</span>
                </div>
              </div>

              <div
                className="hud-gift-card"
                title="Bấm để Dâng Hoa Sen Vàng"
                onClick={() => callRpc('temple.offerGift', { user: centralInfo.name, giftType: 'lotus', coins: 15 })}
              >
                <div className="gift-coin-tag">10+ COINS</div>
                <div className="gift-card-body">
                  <span className="gift-emoji">🪷</span>
                  <span className="gift-title">Hoa sen</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hud-right-leaderboard">
            <div className="hud-lb-header">TẤM LÒNG THÀNH</div>
            <div className="hud-lb-list">
              {topDevotees.map((item) => (
                <div key={item.rank} className="leader-item">
                  <span className="leader-rank">{item.rank}</span>
                  <span className="leader-name">
                    {item.name.length > 14 ? item.name.slice(0, 14) + '...' : item.name}
                  </span>
                  <span className="leader-merit">{Number(item.merit).toLocaleString('vi-VN')}</span>
                </div>
              ))}
            </div>
          </div>
        </footer>

        {/* BANNER ĐẠI LỄ KIM LONG CHẦU PHẬT */}
        <div className={`grand-ceremony-banner ${grandBanner.visible ? 'visible' : ''}`}>
          <div className="grand-title">🐉 {grandBanner.giftName.toUpperCase() || 'ĐẠI LỄ KIM LONG CHẦU PHẬT'} 🐉</div>
          <div className="grand-sub">
            Đại Thí Chủ {grandBanner.user} • Công Đức Vô Lượng (+{grandBanner.merit} CĐ)
          </div>
        </div>

        {/* MODAL TỜ GIẢI QUẺ LINH XĂM */}
        <div
          className={`fortune-modal-overlay ${fortuneModal.visible ? 'visible' : ''}`}
          onClick={() => setFortuneModal((prev) => ({ ...prev, visible: false }))}
        >
          <div className="fortune-scroll-card" onClick={(e) => e.stopPropagation()}>
            <div className="fortune-badge">{fortuneModal.fortune?.rank?.toUpperCase()}</div>
            <div className="fortune-heading">
              Quẻ Số {fortuneModal.fortune?.number} — {fortuneModal.fortune?.title}
            </div>
            <div className="fortune-devotee">Thí chủ xin quẻ: {fortuneModal.user}</div>
            <div className="fortune-poem">{fortuneModal.fortune?.poem}</div>
            <div className="fortune-meaning">Lời bàn: {fortuneModal.fortune?.meaning}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

