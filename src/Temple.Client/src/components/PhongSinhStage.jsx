import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import phongsinhBgImg from '../assets/phongsinh_bg.jpg';
import monkAvatarImg from '../assets/phongsinh_monk.jpg';
import devoteeImg from '../assets/phongsinh_devotee.png';
import crouchBoyImg from '../assets/crouch_boy.png';
import crouchGirlImg from '../assets/crouch_girl.png';

// 6 Nhân vật 3D Pixar đa dạng màu áo và quần riêng biệt
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
  girl_purple: girlPurpleImg,
  crouch_boy: crouchBoyImg,
  crouch_girl: crouchGirlImg
};

const ALL_MODELS = [
  { sprite: 'devotee', crouchSprite: 'crouch_boy' },
  { sprite: 'boy', crouchSprite: 'crouch_boy' },
  { sprite: 'girl', crouchSprite: 'crouch_girl' },
  { sprite: 'man_yellow', crouchSprite: 'crouch_boy' },
  { sprite: 'girl_blue', crouchSprite: 'crouch_girl' },
  { sprite: 'man_orange', crouchSprite: 'crouch_boy' },
  { sprite: 'girl_purple', crouchSprite: 'crouch_girl' }
];

const AVATAR_COLORS = [
  '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#009688', '#4caf50', '#ff9800', '#ff5722'
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// 11 TUYẾN ĐƯỜNG ĐI BỘ 3D TRÊN SÂN ĐÁ (ĐI RA, ĐI VÔ, ĐI QUA ĐI LẠI, ĐI CHÉO)
const PS_ROUTES = [
  { id: 'r1', route: 'route-ps-depth-out-left', duration: 11.5, dir: -1, type: 'out', spawnX: 200, spawnY: 1380 },
  { id: 'r2', route: 'route-ps-depth-out-right', duration: 11.0, dir: 1, type: 'out', spawnX: 820, spawnY: 1400 },
  { id: 'r3', route: 'route-ps-depth-out-center', duration: 12.0, dir: 1, type: 'out', spawnX: 500, spawnY: 1460 },
  { id: 'r4', route: 'route-ps-depth-in-left', duration: 12.5, dir: 1, type: 'in', spawnX: 470, spawnY: 980 },
  { id: 'r5', route: 'route-ps-depth-in-right', duration: 12.0, dir: -1, type: 'in', spawnX: 570, spawnY: 990 },
  { id: 'r6', route: 'route-ps-cross-mid-lr', duration: 13.0, dir: 1, type: 'cross', spawnX: 860, spawnY: 1170 },
  { id: 'r7', route: 'route-ps-cross-mid-rl', duration: 13.5, dir: -1, type: 'cross', spawnX: 170, spawnY: 1160 },
  { id: 'r8', route: 'route-ps-cross-front-lr', duration: 12.0, dir: 1, type: 'cross', spawnX: 880, spawnY: 1420 },
  { id: 'r9', route: 'route-ps-cross-front-rl', duration: 12.5, dir: -1, type: 'cross', spawnX: 140, spawnY: 1400 },
  { id: 'r10', route: 'route-ps-diag-down-right', duration: 13.0, dir: 1, type: 'diag', spawnX: 800, spawnY: 1420 },
  { id: 'r11', route: 'route-ps-diag-down-left', duration: 13.0, dir: -1, type: 'diag', spawnX: 220, spawnY: 1420 }
];

// Danh sách 6 người đi lại liên tục trên sân đá (Đi ra đi vô & Đi qua đi lại)
const INITIAL_PS_WALKERS = [
  {
    id: 'ps_w1',
    defaultName: 'Nguyễn Nhân',
    sprite: 'devotee',
    crouchSprite: 'crouch_boy',
    route: 'route-ps-depth-out-left',
    duration: 11.5,
    dir: -1,
    releasedCount: 150,
    cycle: 0
  },
  {
    id: 'ps_w2',
    defaultName: 'Mai Lan',
    sprite: 'girl_blue',
    crouchSprite: 'crouch_girl',
    route: 'route-ps-cross-mid-lr',
    duration: 13.0,
    dir: 1,
    releasedCount: 120,
    cycle: 0
  },
  {
    id: 'ps_w3',
    defaultName: 'Thanh Bình',
    sprite: 'man_orange',
    crouchSprite: 'crouch_boy',
    route: 'route-ps-depth-in-right',
    duration: 12.0,
    dir: -1,
    releasedCount: 90,
    cycle: 0
  },
  {
    id: 'ps_w4',
    defaultName: 'Bảo Châu',
    sprite: 'girl_purple',
    crouchSprite: 'crouch_girl',
    route: 'route-ps-diag-down-left',
    duration: 13.0,
    dir: -1,
    releasedCount: 80,
    cycle: 0
  },
  {
    id: 'ps_w5',
    defaultName: 'Anh Tuấn',
    sprite: 'man_yellow',
    crouchSprite: 'crouch_boy',
    route: 'route-ps-cross-front-rl',
    duration: 12.5,
    dir: -1,
    releasedCount: 65,
    cycle: 0
  },
  {
    id: 'ps_w6',
    defaultName: 'Thanh Vân',
    sprite: 'girl',
    crouchSprite: 'crouch_girl',
    route: 'route-ps-depth-out-center',
    duration: 12.0,
    dir: 1,
    releasedCount: 50,
    cycle: 0
  }
];

// 4 Phật tử đứng ngắm cảnh tại các góc đẹp trên sân đá (Lan can nhìn sông, bậc gác chuông)
const INITIAL_PS_VANTAGE = [
  { id: 'ps_v1', defaultName: 'Trường-Bạc Liêu', count: 50, x: 740, y: 1040, scale: 0.74, dir: -1, sprite: 'boy', crouchSprite: 'crouch_boy' },
  { id: 'ps_v2', defaultName: 'Thu Phương', count: 50, x: 860, y: 1070, scale: 0.78, dir: -1, sprite: 'girl_purple', crouchSprite: 'crouch_girl' },
  { id: 'ps_v3', defaultName: 'Thúy Vân', count: 50, x: 720, y: 1150, scale: 0.82, dir: -1, sprite: 'girl_blue', crouchSprite: 'crouch_girl' },
  { id: 'ps_v4', defaultName: 'BO', count: 50, x: 210, y: 1190, scale: 0.85, dir: 1, sprite: 'devotee', crouchSprite: 'crouch_boy' }
];

export default function PhongSinhStage({ state, activeEvent, audio, callRpc, obsMode }) {
  const stageWrapperRef = useRef(null);
  const stage9x16Ref = useRef(null);
  const processedEventIdRef = useRef(null);

  // Người đi bộ chiều sâu 3D trên sân đá
  const [walkers, setWalkers] = useState(INITIAL_PS_WALKERS);

  // Người đứng ngắm cảnh tại các vị trí cố định
  const [vantageDevotees, setVantageDevotees] = useState(INITIAL_PS_VANTAGE);

  // Trạng thái cúi người phóng sinh của từng nhân vật nền
  const [crouchStates, setCrouchStates] = useState({});

  // VIP FOCUS DEVOTEE: Người xem vừa vào Live / Follow / Donate được focus to rõ với Spotlight
  const [activeFocusDevotee, setActiveFocusDevotee] = useState(null);
  const focusTimerRef = useRef(null);
  const focusCrouchTimerRef = useRef(null);
  const focusExitTimerRef = useRef(null);

  // Danh sách chim đang bay trên màn hình
  const [birds, setBirds] = useState([]);
  const birdIdGen = useRef(0);

  // Tim bay khi người dùng thả tim
  const [floatingHearts, setFloatingHearts] = useState([]);
  const heartIdGen = useRef(0);

  // Bài nhạc đang phát trong playlist NhacCuaTui (22 bài Phật giáo không lời)
  const [currentTrack, setCurrentTrack] = useState(() => audio?.getCurrentPhongsinhTrack?.() || null);

  useEffect(() => {
    if (audio) {
      setCurrentTrack(audio.getCurrentPhongsinhTrack?.() || null);
      audio.onPhongsinhTrackChange = (track) => {
        setCurrentTrack(track);
      };
    }
    return () => {
      if (audio) audio.onPhongsinhTrackChange = null;
    };
  }, [audio]);

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

    setBirds(prev => [...prev.slice(-45), ...flock]);

    // Âm thanh chim vỗ cánh / hót
    if (audio?.playBirdChirp) {
      audio.playBirdChirp();
    }
  }, [audio]);

  // Kích hoạt Phật tử (Walker hoặc Vantage) cúi xuống đặt lồng chim mở nắp thả chim
  const triggerCrouchAndRelease = useCallback((id, birdsCount = 14, originPos = null) => {
    setCrouchStates(prev => ({
      ...prev,
      [id]: {
        isCrouching: true,
        until: Date.now() + 3800
      }
    }));

    setTimeout(() => {
      let x = 540;
      let y = 1350;
      if (originPos) {
        x = originPos.x;
        y = originPos.y;
      } else {
        const v = vantageDevotees.find(item => item.id === id);
        if (v) {
          x = v.x + 30;
          y = v.y + 120 * v.scale;
        } else {
          const w = walkers.find(item => item.id === id);
          const rObj = PS_ROUTES.find(r => r.route === w?.route);
          if (rObj) {
            x = rObj.spawnX;
            y = rObj.spawnY;
          }
        }
      }
      spawnFlock(x, y, birdsCount);
    }, 350);
  }, [vantageDevotees, walkers, spawnFlock]);

  // KÍCH HOẠT FOCUS NGƯỜI MỚI VÀO LIVE / TƯƠNG TÁC: XUẤT HIỆN SPOTLIGHT + TÊN TO RÕ + CÚI THẢ CHIM CHÍNH DIỆN
  const triggerFocusViewer = useCallback((user, avatar, actionType = 'greet', customText = '', count = 0) => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    if (focusCrouchTimerRef.current) clearTimeout(focusCrouchTimerRef.current);
    if (focusExitTimerRef.current) clearTimeout(focusExitTimerRef.current);

    const model = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];
    let actionTag = '✨ VỪA VÀO LIVE ✨';
    let chatBubble = 'Chào mọi người, em vừa vào live phóng sinh chim! 🕊️✨';

    if (actionType === 'greet') {
      actionTag = '✨ VỪA VÀO LIVE ✨';
      chatBubble = 'Chào Sư thầy và cả nhà, em cùng phóng sinh tích đức! 🙏';
    } else if (actionType === 'follow') {
      actionTag = '➕ ĐÃ FOLLOW KÊNH';
      chatBubble = 'Em vừa bấm follow kênh, chúc cả nhà vạn sự cát tường! 🌸';
    } else if (actionType === 'heart') {
      actionTag = `❤️ THẢ ${count || 10} TIM`;
      chatBubble = `Em thả ${count || 10} tim trợ duyên cho buổi phóng sinh! ❤️`;
    } else if (actionType === 'donate') {
      actionTag = `🕊️ PHÓNG SINH ${count || 50} CHIM`;
      chatBubble = `Em xin ủng hộ phóng sinh ${count || 50} chú chim về với tự do! 🕊️`;
    }

    const focusObj = {
      id: `focus_${Date.now()}`,
      name: user || 'Thí Chủ Hữu Duyên',
      avatar: avatar || '',
      avatarBg: getAvatarColor(user || 'user'),
      sprite: model.sprite,
      crouchSprite: model.crouchSprite,
      actionType,
      actionTag,
      chatBubble: customText ? (customText.length > 40 ? customText.slice(0, 40) + '...' : customText) : chatBubble,
      phaseClass: 'phase-walk-in',
      isCrouching: false
    };

    setActiveFocusDevotee(focusObj);

    // Sau 3.6s sải bước ra tiền cảnh trung tâm -> Cúi người đặt lồng mở cửa phóng sinh chim
    focusCrouchTimerRef.current = setTimeout(() => {
      setActiveFocusDevotee(prev => {
        if (!prev || prev.id !== focusObj.id) return prev;
        return {
          ...prev,
          phaseClass: 'phase-crouch',
          isCrouching: true
        };
      });

      // Bung đàn bồ câu lớn 25 con từ chính lồng chim của nhân vật được focus!
      spawnFlock(530, 1450, 25);
      if (audio?.playBirdChirp) {
        audio.playBirdChirp();
      }

      // Sau 4s thả chim -> Đứng dậy vẫy tay và dạo bước ra
      focusExitTimerRef.current = setTimeout(() => {
        setActiveFocusDevotee(prev => {
          if (!prev || prev.id !== focusObj.id) return prev;
          return {
            ...prev,
            phaseClass: 'phase-walk-out',
            isCrouching: false
          };
        });

        // Sau 3.2s đi ra -> Hoàn tất phiên focus
        focusTimerRef.current = setTimeout(() => {
          setActiveFocusDevotee(null);
        }, 3200);
      }, 4000);
    }, 3600);
  }, [audio, spawnFlock]);

  // Xử lý khi một người đi bộ hoàn thành 1 tuyến đường:
  const handleWalkerEnd = useCallback((walker) => {
    setWalkers(prev => prev.map(w => {
      if (w.id !== walker.id) return w;

      const otherRoutes = PS_ROUTES.filter(r => r.route !== w.route);
      const chosenRoute = otherRoutes[Math.floor(Math.random() * otherRoutes.length)] || PS_ROUTES[0];
      const model = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];

      if (Math.random() < 0.3) {
        setTimeout(() => {
          triggerCrouchAndRelease(w.id, Math.floor(10 + Math.random() * 8), {
            x: chosenRoute.spawnX,
            y: chosenRoute.spawnY
          });
        }, 100);
      }

      return {
        ...w,
        cycle: (w.cycle || 0) + 1,
        route: chosenRoute.route,
        duration: chosenRoute.duration + (Math.random() * 2 - 1),
        dir: chosenRoute.dir,
        sprite: model.sprite,
        crouchSprite: model.crouchSprite
      };
    }));
  }, [triggerCrouchAndRelease]);

  // Luân phiên tự động thả chim trên sân: Cứ mỗi 3.2s chọn 1 người cúi xuống thả chim
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      setCrouchStates(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [id, st] of Object.entries(next)) {
          if (st.isCrouching && now >= st.until) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      const allDevotees = [
        ...walkers.map(w => ({ id: w.id, isWalker: true, route: w.route })),
        ...vantageDevotees.map(v => ({ id: v.id, isWalker: false, x: v.x, y: v.y, scale: v.scale }))
      ];

      const standing = allDevotees.filter(d => !crouchStates[d.id]?.isCrouching);
      if (standing.length > 0 && !activeFocusDevotee) {
        const pick = standing[Math.floor(Math.random() * standing.length)];
        triggerCrouchAndRelease(pick.id, Math.floor(12 + Math.random() * 8));
      }
    }, 3200);

    return () => clearInterval(timer);
  }, [crouchStates, walkers, vantageDevotees, activeFocusDevotee, triggerCrouchAndRelease]);

  // Tự động dọn dẹp chim bay khỏi màn hình
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

  // Xử lý sự kiện Realtime từ Server (.NET JSON-RPC WebSocket)
  useEffect(() => {
    if (!activeEvent || activeEvent.id === processedEventIdRef.current) return;
    processedEventIdRef.current = activeEvent.id;

    const { type, user, avatar, coins, count, ttsText } = activeEvent;
    const cleanUser = user || 'Thí Chủ Hữu Duyên';

    // 1. Nếu có ttsText -> Phát âm thanh cảm ơn / chúc phúc
    if (ttsText && audio?.queueTts) {
      audio.queueTts(ttsText, activeEvent.ttsVoice || 'maichi');
    }

    // 2. Kích hoạt FOCUS NGƯỜI MỚI VÀO LIVE / ĐÓNG GÓP TƯƠNG TÁC + Cập nhật Banner đối thoại
    if (type === 'phongsinhGreet' || type === 'bothiGreet' || type === 'templeGreet') {
      setSpeech({
        user: cleanUser,
        tag: 'Vừa vào phòng Live ✨',
        text: ttsText || `Chào mừng ${cleanUser} đã đến với buổi phóng sinh chim tích đức!`,
        time: Date.now()
      });
      triggerFocusViewer(cleanUser, avatar, 'greet', ttsText);
    } else if (type === 'phongsinhRelease' || type === 'bothiDonate' || type === 'offerGift' || type === 'grandCeremony') {
      const birdsCount = count > 1 ? count : (coins ? coins * 5 : 50);
      setSpeech({
        user: cleanUser,
        tag: `Đã phóng sinh ${birdsCount} chú chim 🕊️`,
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã ủng hộ phóng sinh ${birdsCount} chú chim về với thiên nhiên! Công đức vô lượng!`,
        time: Date.now()
      });
      triggerFocusViewer(cleanUser, avatar, 'donate', ttsText, birdsCount);
      spawnHearts(540, 1300, 10);
    } else if (type === 'phongsinhHeart' || type === 'bothiHeart' || type === 'strikeWoodenFish') {
      setSpeech({
        user: cleanUser,
        tag: `Đã thả ${count || 1} tim trợ duyên ❤️`,
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã thả tim trợ duyên phóng sinh chim!`,
        time: Date.now()
      });
      triggerFocusViewer(cleanUser, avatar, 'heart', ttsText, count || 1);
      spawnHearts(540, 1400, 8);
    } else if (type === 'phongsinhFollow' || type === 'bothiFollow' || type === 'templeFollow') {
      setSpeech({
        user: cleanUser,
        tag: 'Đã follow kênh ➕',
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã follow kênh đồng hành cùng hoạt động phóng sinh tích đức!`,
        time: Date.now()
      });
      triggerFocusViewer(cleanUser, avatar, 'follow', ttsText);
    } else if (type === 'phongsinhShare' || type === 'bothiShare' || type === 'templeShare') {
      setSpeech({
        user: cleanUser,
        tag: 'Đã chia sẻ live 🔄',
        text: ttsText || `Cảm ơn anh/chị ${cleanUser} đã chia sẻ buổi live lan tỏa phước báu đến muôn nơi!`,
        time: Date.now()
      });
      triggerFocusViewer(cleanUser, avatar, 'greet', ttsText);
    }
  }, [activeEvent, audio, triggerFocusViewer, spawnHearts]);

  // Click thủ công trên màn hình để phóng sinh thử nghiệm và test Focus người xem
  const handleStageClick = (e) => {
    const rect = stage9x16Ref.current.getBoundingClientRect();
    const scale = Math.min(rect.width / 1080, rect.height / 1920);
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    if (clickY > 850 && clickY < 1650) {
      triggerFocusViewer('Phật Tử Hữu Duyên', '', 'greet', 'Chào mừng đến với buổi phóng sinh chim!');
      spawnHearts(clickX, clickY, 6);
      callRpc('temple.releaseBirds', {
        user: 'Phật Tử Hữu Duyên',
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
          <div className="phongsinh-top-left-wrap">
            <div className="phongsinh-mode-chip">
              <span className="live-dot-pulse" />
              <span>🕊️ PHÓNG SINH CHIM • TÍCH ĐỨC TÂM LINH</span>
            </div>
            {currentTrack && (
              <div
                className="phongsinh-music-pill"
                title="Nhạc Phật Giáo Không Lời Dễ Ngủ (NhacCuaTui) - Bấm để chuyển bài"
                onClick={(e) => {
                  e.stopPropagation();
                  audio?.nextPhongsinhTrack?.();
                }}
              >
                <span className="music-pulse-icon">🎵</span>
                <span className="music-track-text">
                  {currentTrack.title} {currentTrack.artist ? `– ${currentTrack.artist}` : ''}
                </span>
                <span className="music-skip-btn">⏭️</span>
              </div>
            )}
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

        {/* 4. MINI-MAP GÓC TRÊN BÊN PHẢI VỚI CÁC CHẤM CHUYỂN ĐỘNG TRỰC QUAN */}
        <div className="phongsinh-minimap-box">
          <div className="minimap-preview">
            <svg viewBox="0 0 100 100" className="minimap-svg">
              {/* Vòng đá đỉnh núi */}
              <polygon points="50,10 85,25 90,65 75,90 25,90 10,65 15,25" fill="#a89a83" stroke="#e0d4be" strokeWidth="2" />
              <polygon points="50,15 80,28 85,62 72,85 28,85 15,62 20,28" fill="#c4b69d" />
              {/* Các chấm nhỏ chuyển động đại diện cho người di chuyển trên sân đá */}
              <circle cx="34" cy="45" r="3.2" fill="#ff9800" className="minimap-dot-1" />
              <circle cx="68" cy="42" r="3.2" fill="#ff9800" className="minimap-dot-2" />
              <circle cx="46" cy="55" r="3.2" fill="#ffc107" className="minimap-dot-3" />
              <circle cx="58" cy="52" r="3.2" fill="#ff9800" className="minimap-dot-4" />
              <circle cx="66" cy="64" r="3.2" fill="#4caf50" className="minimap-dot-1" />
              <circle cx="36" cy="70" r="3.2" fill="#ff9800" className="minimap-dot-2" />
              <circle cx="50" cy="78" r="3.2" fill="#00bcd4" className="minimap-dot-3" />
              <circle cx="76" cy="72" r="3.2" fill="#ff9800" className="minimap-dot-4" />
            </svg>
          </div>
          <div className="minimap-tag">Mini-Map</div>
        </div>

        {/* 5. CÁC PHẬT TỬ DI CHUYỂN TRÊN SÂN ĐÁ: ĐI RA, ĐI VÔ, ĐI QUA ĐI LẠI VÀ CÚI THẢ CHIM */}
        <div className="phongsinh-devotees-layer">
          {/* A. VIP FOCUS DEVOTEE: NGƯỜI MỚI VÀO LIVE / ĐÓNG GÓP ĐƯỢC FOCUS TO RÕ, NỔI BẬT NHẤT SÂN ĐÁ */}
          {activeFocusDevotee && (
            <div
              key={activeFocusDevotee.id}
              className={`ps-focus-devotee ${activeFocusDevotee.phaseClass}`}
            >
              {/* CHÙM SÁNG SPOTLIGHT VÀ VÒNG HÀO QUANG DƯỚI CHÂN */}
              <div className="focus-spotlight-beam" />
              <div className="focus-ground-halo" />

              {/* BẢNG TÊN FOCUS VÀNG KIM NỔI BẬT NHẤT LIVE */}
              <div className="ps-focus-badge">
                {activeFocusDevotee.chatBubble && (
                  <div className="focus-chat-bubble">
                    <span>{activeFocusDevotee.chatBubble}</span>
                    <div className="focus-chat-tail" />
                  </div>
                )}

                <div className="focus-capsule-badge">
                  <div className="focus-avatar-ring">
                    {activeFocusDevotee.avatar ? (
                      <img src={activeFocusDevotee.avatar} alt="" className="focus-avatar-img" />
                    ) : (
                      <div className="focus-avatar-fallback" style={{ background: activeFocusDevotee.avatarBg }}>
                        {activeFocusDevotee.name ? activeFocusDevotee.name.slice(0, 1).toUpperCase() : '✨'}
                      </div>
                    )}
                  </div>
                  <div className="focus-user-info">
                    <span className="focus-username">@{activeFocusDevotee.name}</span>
                    <span className={`focus-action-tag tag-${activeFocusDevotee.actionType}`}>
                      {activeFocusDevotee.actionTag}
                    </span>
                  </div>
                </div>
              </div>

              {/* HÌNH ẢNH NHÂN VẬT 3D CỦA NGƯỜI ĐÓ */}
              <div className="devotee-character-container">
                <img
                  src={activeFocusDevotee.isCrouching
                    ? (CHARACTER_SPRITES[activeFocusDevotee.crouchSprite] || crouchBoyImg)
                    : (CHARACTER_SPRITES[activeFocusDevotee.sprite] || devoteeImg)
                  }
                  alt={activeFocusDevotee.name}
                  className={`devotee-sprite-img ${activeFocusDevotee.isCrouching ? 'crouching-pose' : 'focus-walking-bob'}`}
                  draggable={false}
                />

                {!activeFocusDevotee.isCrouching ? (
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
                ) : (
                  <div className="crouch-release-burst">
                    <div className="cage-aura-burst" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. NGƯỜI ĐI BỘ CHIỀU SÂU 3D VÀ ĐI NGANG SÂN (WALKERS) */}
          {walkers.map((w, idx) => {
            const matchedLeader = state?.leaderboard?.[idx];
            const displayName = matchedLeader?.name || w.defaultName;
            const releasedCount = matchedLeader?.birdsReleased || w.releasedCount;
            const isCrouching = Boolean(crouchStates[w.id]?.isCrouching);

            const spriteImg = isCrouching
              ? (CHARACTER_SPRITES[w.crouchSprite] || crouchBoyImg)
              : (CHARACTER_SPRITES[w.sprite] || devoteeImg);

            return (
              <div
                key={`${w.id}_${w.cycle || 0}`}
                className={`ps-walker ${w.route} ${isCrouching ? 'is-crouching' : ''}`}
                style={{ animationDuration: `${w.duration}s` }}
                onAnimationEnd={() => handleWalkerEnd(w)}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerCrouchAndRelease(w.id, 25);
                  callRpc('temple.releaseBirds', {
                    user: displayName,
                    count: 50,
                    wish: 'Phóng sinh chim tích đức, vạn sự cát tường'
                  });
                }}
              >
                <div
                  className="ps-walker-flip"
                  style={{ transform: w.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}
                >
                  <div className="ps-walker-bob">
                    {/* BẢNG TÊN & SỐ LƯỢNG ĐÃ PHÓNG (ĐẢO NGƯỢC X ĐỂ CHỮ KHÔNG BỊ NGƯỢC CHIỀU) */}
                    <div
                      className={`devotee-badge ${isCrouching ? 'badge-crouching-glow' : ''}`}
                      style={{ transform: w.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}
                    >
                      <div className="badge-name">{displayName}</div>
                      <div className="badge-count">
                        {isCrouching ? '🕊️ Đang thả chim...' : `Đã phóng: ${releasedCount}`}
                      </div>
                    </div>

                    {/* HÌNH ẢNH NHÂN VẬT ĐI BỘ CẦM LỒNG CHIM */}
                    <div className="devotee-character-container">
                      <img
                        src={spriteImg}
                        alt={displayName}
                        className={`devotee-sprite-img ${isCrouching ? 'crouching-pose' : ''}`}
                        draggable={false}
                      />

                      {/* Lồng chim: khi đi bộ thì cầm đung đưa; khi cúi thả thì hào quang nở rộ */}
                      {!isCrouching ? (
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
                      ) : (
                        <div className="crouch-release-burst">
                          <div className="cage-aura-burst" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* C. PHẬT TỬ ĐỨNG NGẮM CẢNH TẠI CÁC GÓC ĐẸP TRÊN SÂN ĐÁ (VANTAGE DEVOTEES) */}
          {vantageDevotees.map((v, idx) => {
            const leaderOffset = idx + walkers.length;
            const matchedLeader = state?.leaderboard?.[leaderOffset];
            const displayName = matchedLeader?.name || v.defaultName;
            const releasedCount = matchedLeader?.birdsReleased || v.count;
            const isCrouching = Boolean(crouchStates[v.id]?.isCrouching);

            const spriteImg = isCrouching
              ? (CHARACTER_SPRITES[v.crouchSprite] || crouchBoyImg)
              : (CHARACTER_SPRITES[v.sprite] || devoteeImg);

            return (
              <div
                key={v.id}
                className={`terrace-devotee-wrapper ${isCrouching ? 'is-crouching' : ''}`}
                style={{
                  left: `${v.x}px`,
                  top: `${v.y + (isCrouching ? 20 : 0)}px`,
                  transform: `scale(${v.scale})`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerCrouchAndRelease(v.id, 25);
                  callRpc('temple.releaseBirds', {
                    user: displayName,
                    count: 50,
                    wish: 'Phóng sinh chim tích đức, vạn sự cát tường'
                  });
                }}
              >
                <div
                  className={`devotee-badge ${isCrouching ? 'badge-crouching-glow' : ''}`}
                  style={{ transform: v.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}
                >
                  <div className="badge-name">{displayName}</div>
                  <div className="badge-count">
                    {isCrouching ? '🕊️ Đang thả chim...' : `Đã phóng: ${releasedCount}`}
                  </div>
                </div>

                <div
                  className="devotee-character-container"
                  style={{ transform: v.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}
                >
                  <img
                    src={spriteImg}
                    alt={displayName}
                    className={`devotee-sprite-img ${isCrouching ? 'crouching-pose' : ''}`}
                    draggable={false}
                  />

                  {!isCrouching ? (
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
                  ) : (
                    <div className="crouch-release-burst">
                      <div className="cage-aura-burst" />
                    </div>
                  )}
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

        {/* 9. GỢI Ý CHẠM MÀN HÌNH ĐỂ PHÓNG SINH */}
        <div className="phongsinh-interactive-hint">
          <span>✨ Chạm vào người hoặc sân đá để thả chim phóng sinh tích đức! 🕊️🙏</span>
        </div>
      </div>
    </div>
  );
}
