import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import phongsinhBgImg from '../assets/phongsinh_bg.jpg';
import monkAvatarImg from '../assets/phongsinh_monk.jpg';
import devoteeImg from '../assets/phongsinh_devotee.png';

// Import thêm các nhân vật 3D cho đàn người đa dạng phong phú
import boyGreenImg from '../assets/pedestrian_boy.png';
import girlPinkImg from '../assets/pedestrian_girl.png';
import manYellowImg from '../assets/pedestrian_man_yellow.png';
import girlBlueImg from '../assets/pedestrian_girl_blue.png';
import manOrangeImg from '../assets/pedestrian_man_orange.png';
import girlPurpleImg from '../assets/pedestrian_girl_purple.png';

const CHARACTER_SPRITES = {
  devotee: devoteeImg,
  boy: boyGreenImg,
  girl: girlPinkImg,
  man_yellow: manYellowImg,
  girl_blue: girlBlueImg,
  man_orange: manOrangeImg,
  girl_purple: girlPurpleImg
};

// Vị trí các Phật tử đứng trên sân đá phóng sinh (Tọa độ tự nhiên theo phối cảnh 3D)
const DEVOTEES_PLATFORM = [
  { id: 'dev_1', defaultName: 'Nguyễn Nhân', count: 50, x: 230, y: 1040, scale: 0.80, sprite: 'devotee' },
  { id: 'dev_2', defaultName: 'Mai Lan', count: 50, x: 740, y: 1030, scale: 0.80, sprite: 'girl_blue' },
  { id: 'dev_3', defaultName: 'Anh Tuấn', count: 50, x: 360, y: 1140, scale: 0.86, sprite: 'boy' },
  { id: 'dev_4', defaultName: 'Bảo Châu', count: 50, x: 530, y: 1080, scale: 0.83, sprite: 'girl' },
  { id: 'dev_5', defaultName: 'Thanh Bình', count: 50, x: 680, y: 1160, scale: 0.88, sprite: 'man_orange' },
  { id: 'dev_6', defaultName: 'Mai Lan', count: 50, x: 860, y: 1070, scale: 0.82, sprite: 'girl_purple' },
  { id: 'dev_7', defaultName: 'Anh Tuấn', count: 50, x: 160, y: 1260, scale: 0.94, sprite: 'devotee' },
  { id: 'dev_8', defaultName: 'Thanh Bình A', count: 50, x: 490, y: 1360, scale: 0.98, sprite: 'man_yellow' },
  { id: 'dev_9', defaultName: 'Nguyen Van A', count: 50, x: 820, y: 1250, scale: 0.93, sprite: 'devotee' },
  { id: 'dev_10', defaultName: 'Thanh Vân', count: 50, x: 920, y: 1380, scale: 1.00, sprite: 'girl' }
];

export default function PhongSinhStage({ state, activeEvent, audio, callRpc, obsMode }) {
  const stageWrapperRef = useRef(null);
  const stage9x16Ref = useRef(null);
  const processedEventIdRef = useRef(null);

  // Danh sách chim đang bay trên màn hình
  const [birds, setBirds] = useState([]);
  const birdIdGen = useRef(0);

  // Tim bay khi người dùng thả tim
  const [floatingHearts, setFloatingHearts] = useState([]);
  const heartIdGen = useRef(0);

  // Thông điệp hiển thị trong Speech Banner phía dưới
  const [speech, setSpeech] = useState({
    user: '',
    tag: '',
    text: 'Chào mừng các User mới!\nHãy cùng nhau phóng sinh chim để tích đức.\n(Số lượng chim hiện tại: >2000)',
    time: Date.now()
  });

  // Tự động co dãn chuẩn tỉ lệ 9:16 (1080x1920) vừa khít khung màn hình
  const fitStage = useCallback(() => {
    if (!stageWrapperRef.current || !stage9x16Ref.current) return;
    const rect = stageWrapperRef.current.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      const scale = Math.min(rect.width / 1080, rect.height / 1920);
      stage9x16Ref.current.style.transform = `scale(${scale})`;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', fitStage);
    fitStage();
    const t1 = requestAnimationFrame(fitStage);
    const t2 = setTimeout(fitStage, 60);
    const t3 = setTimeout(fitStage, 250);
    return () => {
      window.removeEventListener('resize', fitStage);
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [fitStage]);

  // Hàm tạo đàn chim bay vút lên bầu trời từ một vị trí (x, y)
  const spawnFlock = useCallback((originX, originY, count = 12) => {
    const flock = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const angleDeg = -55 - Math.random() * 70; // Bay hướng lên trên chéo trái hoặc phải
      const speed = 300 + Math.random() * 260; // Tốc độ bay
      const delay = i * 0.08 + Math.random() * 0.05;
      const id = ++birdIdGen.current;

      flock.push({
        id,
        startX: originX + (Math.random() - 0.5) * 60,
        startY: originY + (Math.random() - 0.5) * 40,
        targetX: originX + Math.cos(angleDeg * Math.PI / 180) * (speed * 3.5),
        targetY: originY + Math.sin(angleDeg * Math.PI / 180) * (speed * 3.5),
        duration: 2.8 + Math.random() * 1.6,
        delay,
        scale: 0.65 + Math.random() * 0.55,
        rotation: angleDeg + 90,
        createdAt: now
      });
    }

    setBirds(prev => [...prev.slice(-40), ...flock]);

    // Âm thanh chim vỗ cánh / hót
    if (audio?.playBirdChirp) {
      audio.playBirdChirp();
    }
  }, [audio]);

  // Tự động dọn dẹp các chú chim đã bay khỏi màn hình
  useEffect(() => {
    if (birds.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setBirds(prev => prev.filter(b => now - b.createdAt < (b.duration + b.delay) * 1000 + 500));
    }, 1000);
    return () => clearInterval(timer);
  }, [birds.length]);

  // Tạo tim bay khi thả tim
  const spawnHearts = useCallback((originX = 540, originY = 1450, count = 6) => {
    const hearts = [];
    for (let i = 0; i < count; i++) {
      hearts.push({
        id: ++heartIdGen.current,
        x: originX + (Math.random() - 0.5) * 180,
        y: originY,
        vx: (Math.random() - 0.5) * 70,
        vy: -220 - Math.random() * 180,
        scale: 0.8 + Math.random() * 0.6,
        color: ['#ff1744', '#f50057', '#ff4081', '#ff5252', '#ff80ab'][Math.floor(Math.random() * 5)],
        createdAt: Date.now()
      });
    }
    setFloatingHearts(prev => [...prev.slice(-30), ...hearts]);
  }, []);

  useEffect(() => {
    if (floatingHearts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setFloatingHearts(prev => prev.filter(h => now - h.createdAt < 2200));
    }, 600);
    return () => clearInterval(timer);
  }, [floatingHearts.length]);

  // Thỉnh thoảng có vài chú chim tự do bay lượn ngẫu nhiên trên bầu trời cho sinh động
  useEffect(() => {
    const ambientTimer = setInterval(() => {
      const randX = 200 + Math.random() * 680;
      const randY = 1100 + Math.random() * 300;
      spawnFlock(randX, randY, Math.floor(3 + Math.random() * 5));
    }, 4500);
    return () => clearInterval(ambientTimer);
  }, [spawnFlock]);

  // Xử lý sự kiện Realtime từ Server (.NET JSON-RPC WebSocket)
  useEffect(() => {
    if (!activeEvent || activeEvent.id === processedEventIdRef.current) return;
    processedEventIdRef.current = activeEvent.id;

    const { type, user, coins, count, ttsText } = activeEvent;
    const cleanUser = user || 'Thí Chủ Hữu Duyên';

    // 1. Nếu có ttsText -> Phát âm thanh cảm ơn / chúc phúc
    if (ttsText && audio?.queueTts) {
      audio.queueTts(ttsText, activeEvent.ttsVoice || 'maichi');
    }

    // 2. Cập nhật Banner đối thoại phía dưới
    if (type === 'phongsinhGreet' || type === 'bothiGreet' || type === 'templeGreet') {
      setSpeech({
        user: cleanUser,
        tag: 'Vừa vào phòng Live ✨',
        text: ttsText || `Chào mừng ${cleanUser} đã đến với buổi phóng sinh chim tích đức!`,
        time: Date.now()
      });
      // Chim bay chào đón
      spawnFlock(540, 1200, 8);
    } else if (type === 'phongsinhRelease' || type === 'bothiDonate' || type === 'offerGift' || type === 'grandCeremony') {
      const birdsCount = count > 1 ? count : (coins ? coins * 5 : 50);
      setSpeech({
        user: cleanUser,
        tag: `Đã phóng sinh ${birdsCount} chú chim 🕊️`,
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã ủng hộ phóng sinh ${birdsCount} chú chim về với thiên nhiên! Công đức vô lượng!`,
        time: Date.now()
      });
      // Phóng thích đàn chim bay rợp trời
      spawnFlock(380, 1150, 16);
      spawnFlock(680, 1180, 16);
      spawnHearts(540, 1300, 10);
    } else if (type === 'phongsinhHeart' || type === 'bothiHeart' || type === 'strikeWoodenFish') {
      setSpeech({
        user: cleanUser,
        tag: `Đã thả ${count || 1} tim trợ duyên ❤️`,
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã thả tim trợ duyên phóng sinh chim!`,
        time: Date.now()
      });
      spawnHearts(540, 1400, 8);
      spawnFlock(540, 1100, 6);
    } else if (type === 'phongsinhFollow' || type === 'bothiFollow' || type === 'templeFollow') {
      setSpeech({
        user: cleanUser,
        tag: 'Đã follow kênh ➕',
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã follow kênh đồng hành cùng hoạt động phóng sinh tích đức!`,
        time: Date.now()
      });
      spawnFlock(350, 1150, 12);
      spawnFlock(720, 1150, 12);
    } else if (type === 'phongsinhShare' || type === 'bothiShare' || type === 'templeShare') {
      setSpeech({
        user: cleanUser,
        tag: 'Đã chia sẻ live 🔄',
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã chia sẻ buổi live lan tỏa phước báu đến muôn nơi!`,
        time: Date.now()
      });
      spawnFlock(540, 1150, 14);
    }
  }, [activeEvent, audio, spawnFlock, spawnHearts]);

  // Click thủ công trên màn hình để phóng sinh thử nghiệm
  const handleStageClick = (e) => {
    // Lấy tọa độ click tương đối trên canvas 1080x1920
    const rect = stage9x16Ref.current.getBoundingClientRect();
    const scale = rect.width / 1080;
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    if (clickY > 800 && clickY < 1600) {
      spawnFlock(clickX, clickY, 15);
      spawnHearts(clickX, clickY, 6);
      callRpc('temple.releaseBirds', {
        user: speech.user || 'Phật Tử Hữu Duyên',
        count: 50,
        wish: 'Cầu cho muôn loài tự do, an lành, hạnh phúc'
      });
    }
  };

  const totalBirds = state?.totalBirdsReleased || 2088;
  const totalHearts = state?.totalHearts || 0;
  const totalFollows = state?.totalFollows || 0;

  // Lấy danh sách Top người phóng sinh từ state.leaderboard
  const topDevotees = useMemo(() => {
    const list = state?.leaderboard || [];
    return list.slice(0, 5);
  }, [state?.leaderboard]);

  return (
    <div className="phongsinh-stage-wrapper" ref={stageWrapperRef}>
      <div
        className="phongsinh-stage-container live-stage-9x16"
        ref={stage9x16Ref}
        onClick={handleStageClick}
      >
        {/* 1. ẢNH NỀN PHỐI CẢNH NÚI NON SÔNG NƯỚC NINH BÌNH TRÀNG AN & SÂN ĐÁ */}
        <img
          src={phongsinhBgImg}
          alt="Ninh Binh Phong Sinh Viewpoint"
          className="phongsinh-bg-image"
          draggable={false}
        />

        {/* 2. THANH TRẠNG THÁI TRÊN CÙNG */}
        <div className="phongsinh-top-bar">
          <div className="phongsinh-mode-chip">
            <span className="live-dot-pulse" />
            <span>🕊️ PHÓNG SINH CHIM • TÍCH ĐỨC TÂM LINH</span>
          </div>
          <div className="phongsinh-stats-pill">
            <span className="stat-bird">🕊️ {totalBirds.toLocaleString('vi-VN')} chim</span>
            <span className="stat-sep">•</span>
            <span className="stat-heart">❤️ {totalHearts.toLocaleString('vi-VN')} tim</span>
            <span className="stat-sep">•</span>
            <span className="stat-follow">➕ {totalFollows.toLocaleString('vi-VN')} follow</span>
          </div>
        </div>

        {/* 3. BẢNG XẾP HẠNG TOP PHÓNG SINH (GÓC TRÊN BÊN TRÁI) */}
        <div className="phongsinh-leaderboard-box">
          <div className="lb-header">
            <span>🏆 TOP PHÓNG SINH TÍCH ĐỨC</span>
          </div>
          <div className="lb-list">
            {topDevotees.length > 0 ? (
              topDevotees.map((dev, idx) => (
                <div key={dev.uniqueId || idx} className="lb-item">
                  <span className={`lb-rank rank-${idx + 1}`}>#{idx + 1}</span>
                  <span className="lb-name">{dev.name}</span>
                  <span className="lb-val">
                    🕊️ {(dev.birdsReleased || (idx === 0 ? 120 : 50)).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="lb-item"><span className="lb-rank rank-1">#1</span><span className="lb-name">Nguyễn Nhân</span><span className="lb-val">🕊️ 150</span></div>
                <div className="lb-item"><span className="lb-rank rank-2">#2</span><span className="lb-name">Mai Lan</span><span className="lb-val">🕊️ 100</span></div>
                <div className="lb-item"><span className="lb-rank rank-3">#3</span><span className="lb-name">Anh Tuấn</span><span className="lb-val">🕊️ 80</span></div>
                <div className="lb-item"><span className="lb-rank rank-4">#4</span><span className="lb-name">Bảo Châu</span><span className="lb-val">🕊️ 50</span></div>
                <div className="lb-item"><span className="lb-rank rank-5">#5</span><span className="lb-name">Thanh Bình</span><span className="lb-val">🕊️ 50</span></div>
              </>
            )}
          </div>
        </div>

        {/* 4. MINI-MAP GÓC TRÊN BÊN PHẢI (Y HỆT HÌNH MẪU CỦA USER) */}
        <div className="phongsinh-minimap-box">
          <div className="minimap-preview">
            <svg viewBox="0 0 100 100" className="minimap-svg">
              {/* Vòng đá đỉnh núi */}
              <polygon points="50,10 85,25 90,65 75,90 25,90 10,65 15,25" fill="#a89a83" stroke="#e0d4be" strokeWidth="2" />
              <polygon points="50,15 80,28 85,62 72,85 28,85 15,62 20,28" fill="#c4b69d" />
              {/* Các chấm nhỏ đại diện người đứng phóng sinh */}
              <circle cx="32" cy="45" r="3" fill="#ff9800" />
              <circle cx="70" cy="42" r="3" fill="#ff9800" />
              <circle cx="45" cy="55" r="3" fill="#ffc107" />
              <circle cx="58" cy="50" r="3" fill="#ff9800" />
              <circle cx="65" cy="62" r="3" fill="#4caf50" />
              <circle cx="38" cy="72" r="3" fill="#ff9800" />
              <circle cx="50" cy="80" r="3" fill="#00bcd4" />
              <circle cx="75" cy="74" r="3" fill="#ff9800" />
            </svg>
          </div>
          <div className="minimap-tag">Mini-Map</div>
        </div>

        {/* 5. CÁC PHẬT TỬ ĐỨNG TRÊN SÂN ĐÁ CẦM LỒNG CHIM PHÓNG SINH */}
        <div className="phongsinh-devotees-layer">
          {DEVOTEES_PLATFORM.map((dev, idx) => {
            const matchedLeader = state?.leaderboard?.[idx];
            const displayName = matchedLeader?.name || dev.defaultName;
            const releasedCount = matchedLeader?.birdsReleased || dev.count;
            const spriteImg = CHARACTER_SPRITES[dev.sprite] || devoteeImg;

            return (
              <div
                key={dev.id}
                className="terrace-devotee-wrapper"
                style={{
                  left: `${dev.x}px`,
                  top: `${dev.y}px`,
                  transform: `scale(${dev.scale})`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  spawnFlock(dev.x + 30, dev.y - 40, 15);
                  callRpc('temple.releaseBirds', {
                    user: displayName,
                    count: 50,
                    wish: 'Phóng sinh chim tích đức, vạn sự cát tường'
                  });
                }}
              >
                {/* BẢNG TÊN & SỐ LƯỢNG ĐÃ PHÓNG TRÊN ĐẦU (Y HỆT HÌNH MẪU) */}
                <div className="devotee-badge">
                  <div className="badge-name">{displayName}</div>
                  <div className="badge-count">Đã phóng: {releasedCount}</div>
                </div>

                {/* HÌNH ẢNH NHÂN VẬT CẦM LỒNG CHIM */}
                <div className="devotee-character-container">
                  <img
                    src={spriteImg}
                    alt={displayName}
                    className="devotee-sprite-img"
                    draggable={false}
                  />
                  {/* Lồng chim nhỏ trên tay nhân vật */}
                  <div className="bamboo-bird-cage">
                    <svg viewBox="0 0 32 36" className="cage-svg">
                      <path d="M16,2 L16,6" stroke="#d7ccc8" strokeWidth="2" />
                      <path d="M6,8 Q16,4 26,8 L24,30 Q16,33 8,30 Z" fill="#8d6e63" stroke="#5d4037" strokeWidth="1.5" />
                      <line x1="11" y1="8" x2="11" y2="30" stroke="#d7ccc8" strokeWidth="1" />
                      <line x1="16" y1="6" x2="16" y2="31" stroke="#d7ccc8" strokeWidth="1" />
                      <line x1="21" y1="8" x2="21" y2="30" stroke="#d7ccc8" strokeWidth="1" />
                      <circle cx="16" cy="18" r="2.5" fill="#ffffff" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. ĐÀN CHIM BAY VÚT LÊN TRỜI */}
        <div className="phongsinh-birds-layer">
          {birds.map(b => (
            <div
              key={b.id}
              className="flying-dove"
              style={{
                '--start-x': `${b.startX}px`,
                '--start-y': `${b.startY}px`,
                '--target-x': `${b.targetX}px`,
                '--target-y': `${b.targetY}px`,
                '--duration': `${b.duration}s`,
                '--delay': `${b.delay}s`,
                '--scale': b.scale,
                '--rotation': `${b.rotation}deg`
              }}
            >
              <svg viewBox="0 0 50 35" className="dove-svg">
                {/* Đôi cánh bồ câu trắng đập nhịp nhàng */}
                <path className="wing left-wing" d="M25,18 Q12,2 2,12 Q14,20 25,18 Z" fill="#ffffff" />
                <path className="wing right-wing" d="M25,18 Q38,2 48,12 Q36,20 25,18 Z" fill="#e8e8e8" />
                <ellipse cx="25" cy="18" rx="8" ry="4" fill="#ffffff" />
                <path d="M23,22 L25,32 L27,22 Z" fill="#ffffff" />
                <circle cx="25" cy="14" r="3.5" fill="#ffffff" />
                <circle cx="26" cy="13" r="0.9" fill="#ff5722" />
              </svg>
            </div>
          ))}
        </div>

        {/* 7. HIỆU ỨNG TIM BAY KHI THẢ TIM */}
        <div className="phongsinh-hearts-layer">
          {floatingHearts.map(h => (
            <div
              key={h.id}
              className="phongsinh-heart"
              style={{
                left: `${h.x}px`,
                top: `${h.y}px`,
                '--vx': `${h.vx}px`,
                '--vy': `${h.vy}px`,
                '--scale': h.scale,
                color: h.color
              }}
            >
              ❤️
            </div>
          ))}
        </div>

        {/* 8. BẢNG ĐỐI THOẠI CHÀO MỪNG / CẢM ƠN (Y HỆT HÌNH MẪU PHÍA DƯỚI) */}
        <div className="phongsinh-dialog-bubble">
          {/* Avatar Nhà Sư hiền hòa đội nón lá */}
          <div className="dialog-avatar-wrap">
            <img
              src={monkAvatarImg}
              alt="Thiền Sư Trụ Trì"
              className="dialog-avatar-img"
            />
          </div>

          {/* Lời thoại chào mừng / cảm ơn */}
          <div className="dialog-text-content">
            {speech.user && (
              <div className="dialog-user-badge">
                <span className="badge-author">@{speech.user}</span>
                {speech.tag && <span className="badge-tag">{speech.tag}</span>}
              </div>
            )}
            <div className="dialog-message-body">
              {speech.text.split('\n').map((line, i) => (
                <div key={i} className={`dialog-line ${i === 0 ? 'main-line' : 'sub-line'}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 9. GỢI Ý CHẠM MÀN HÌNH ĐỂ PHÓNG SINH (Chỉ hiển thị nhẹ nhàng) */}
        <div className="phongsinh-interactive-hint">
          <span>✨ Chạm vào người hoặc sân đá để thả chim phóng sinh tích đức! 🕊️🙏</span>
        </div>
      </div>
    </div>
  );
}

