import React, { useEffect, useRef, useState, useCallback } from 'react';
import marketBgImg from '../assets/market_street_clean.jpg';
import beggarKidImg from '../assets/beggar_kid.png';

// 6 Nhân vật 3D Pixar đa dạng màu áo và quần riêng biệt
import manYellowImg from '../assets/pedestrian_man_yellow.png';   // Áo vàng, Quần short navy
import girlBlueImg from '../assets/pedestrian_girl_blue.png';       // Áo xanh da trời, Quần trắng
import manOrangeImg from '../assets/pedestrian_man_orange.png';    // Áo polo cam đỏ, Quần jean xanh
import girlPurpleImg from '../assets/pedestrian_girl_purple.png';  // Áo tím hoa cà, Quần kaki be
import boyGreenImg from '../assets/pedestrian_boy.png';            // Áo xanh lá cây, Quần xám
import girlPinkImg from '../assets/pedestrian_girl.png';           // Áo hồng đào, Quần jean xanh

const SPRITE_MAP = {
  man_yellow: manYellowImg,
  girl_blue: girlBlueImg,
  man_orange: manOrangeImg,
  girl_purple: girlPurpleImg,
  boy_green: boyGreenImg,
  girl_pink: girlPinkImg
};

const ALL_MODELS = ['man_yellow', 'girl_blue', 'man_orange', 'girl_purple', 'boy_green', 'girl_pink'];

function getSpriteImage(modelKey) {
  return SPRITE_MAP[modelKey] || manYellowImg;
}

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

const AMBIENT_NAMES = [
  'Bác Ba Mua Rau',
  'Chị Tư Đi Chợ',
  'Anh Bảy Hải Sản',
  'Bé Mai Đi Học',
  'Cô Năm Bách Hóa',
  'Chú Tư Cà Phê',
  'Lan Anh',
  'Hoàng Long',
  'Thu Trang',
  'Hồng Phúc'
];

const AMBIENT_CHATS = [
  'Matcha của T tới đây! 🍵',
  'Bánh mì nóng giòn đây! 🥖',
  'Hôm nay phố chợ đông vui quá! 🌸',
  'Cà phê sáng thơm ngon! ☕',
  'Cho em tiền uống bia nè! 🍺',
  'Ủng hộ em trai ly bia nhé! 🍻',
  'Mua rau củ tươi ngon nào! 🥦',
  'Chúc em đông khách nha! ✨'
];

// Khách xem hàng tại các sạp 2 bên vỉa hè (Khác độ cao & chiều sâu, không đứng 1 hàng)
const INITIAL_BROWSERS = [
  {
    id: 'br_1',
    name: 'Diệu Thảo Tâm An',
    avatar: '',
    model: 'girl_blue', // Áo xanh da trời, Quần trắng
    x: 75,
    y: 1140,
    scale: 0.88,
    zIndex: 36,
    dir: 1,
    chat: 'Hôm nay chợ đông vui quá! 🌸',
    metricText: '❤️ +50'
  },
  {
    id: 'br_2',
    name: 'Trần Minh Quân',
    avatar: '',
    model: 'man_orange', // Áo polo cam đỏ, Quần jean
    x: 235,
    y: 975,
    scale: 0.65,
    zIndex: 22,
    dir: 1,
    chat: 'Bánh mì nóng giòn đây! 🥖',
    metricText: '🪙 +20đ'
  },
  {
    id: 'br_3',
    name: 'Phạm Thanh Hà',
    avatar: '',
    model: 'girl_purple', // Áo tím hoa cà, Quần kaki be
    x: 765,
    y: 975,
    scale: 0.65,
    zIndex: 22,
    dir: -1,
    chat: 'Cà phê sáng thơm ngon! ☕',
    metricText: '🪙 +50đ'
  },
  {
    id: 'br_4',
    name: 'Lê Hoàng Nam',
    avatar: '',
    model: 'man_yellow', // Áo vàng, Quần short navy
    x: 915,
    y: 1140,
    scale: 0.88,
    zIndex: 36,
    dir: -1,
    chat: 'Ủng hộ em trai ly bia! 🍻',
    metricText: '👑 TOP 1'
  }
];

// Tuyến đường đi bộ di chuyển qua lại liên tục 3D (Trái qua phải, Phải qua trái, Chiều sâu)
const DEPTH_ROUTES = [
  { route: 'route-traverse-left-to-right', duration: 11.5, dir: 1 },
  { route: 'route-traverse-right-to-left', duration: 12.0, dir: -1 },
  { route: 'route-traverse-mid-l2r', duration: 13.5, dir: 1 },
  { route: 'route-traverse-mid-r2l', duration: 14.0, dir: -1 },
  { route: 'route-depth-out-left', duration: 11.0, dir: -1 },
  { route: 'route-depth-out-right', duration: 11.5, dir: 1 },
  { route: 'route-depth-in-left', duration: 12.0, dir: 1 },
  { route: 'route-depth-in-right', duration: 12.5, dir: -1 }
];

const INITIAL_WALKERS = [
  {
    id: 'dw_1',
    name: 'Vũ Đức Thịnh',
    avatar: '',
    model: 'boy_green', // Áo xanh lá cây, Quần xám
    route: 'route-traverse-left-to-right',
    duration: 11.5,
    delay: 0,
    dir: 1,
    chat: 'Cho em tiền uống bia nè! 🍺',
    metricText: '🪙 +10đ'
  },
  {
    id: 'dw_2',
    name: 'Ngọc Anh Nguyễn',
    avatar: '',
    model: 'girl_pink', // Áo hồng, Quần jean xanh
    route: 'route-traverse-right-to-left',
    duration: 12.5,
    delay: 1.5,
    dir: -1,
    chat: 'Matcha của T tới đây! 🍵',
    metricText: '❤️ +10'
  },
  {
    id: 'dw_3',
    name: 'Bác Ba Mua Rau',
    avatar: '',
    model: 'man_yellow', // Áo vàng, Quần short navy
    route: 'route-traverse-mid-l2r',
    duration: 13.5,
    delay: 3.2,
    dir: 1,
    chat: 'Mua rau củ tươi ngon nào! 🥦',
    metricText: 'DẠO PHỐ'
  },
  {
    id: 'dw_4',
    name: 'Chị Tư Đi Chợ',
    avatar: '',
    model: 'girl_blue', // Áo xanh da trời, Quần trắng
    route: 'route-traverse-mid-r2l',
    duration: 14.0,
    delay: 4.8,
    dir: -1,
    chat: 'Phố chợ đông vui quá! ✨',
    metricText: 'DẠO PHỐ'
  },
  {
    id: 'dw_5',
    name: 'Hoàng Long',
    avatar: '',
    model: 'man_orange',
    route: 'route-depth-out-left',
    duration: 11.0,
    delay: 2.2,
    dir: -1,
    chat: 'Ủng hộ bé trai mua sữa nào! 🥛',
    metricText: '🪙 +20đ'
  },
  {
    id: 'dw_6',
    name: 'Thu Trang',
    avatar: '',
    model: 'girl_purple',
    route: 'route-depth-in-right',
    duration: 12.0,
    delay: 6.0,
    dir: -1,
    chat: 'Cùng chung tay giúp đỡ nhé! 🌸',
    metricText: 'DẠO PHỐ'
  }
];

export default function BothiStage({ state, activeEvent, audio, callRpc, obsMode }) {
  const stageWrapperRef = useRef(null);
  const stage9x16Ref = useRef(null);
  const processedEventIdRef = useRef(null);

  // Kid emotion states: 'crying' | 'greeting' | 'cheering'
  const [kidMood, setKidMood] = useState('crying');

  // Character speech bubble
  const [speech, setSpeech] = useState({
    user: 'Anh/Chị',
    avatar: '',
    text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để có tiền uống bia! 🍺🙏',
    isHappy: false
  });

  // Floating effects
  const [coinsList, setCoinsList] = useState([]);
  const [heartsList, setHeartsList] = useState([]);
  const [cheersBanner, setCheersBanner] = useState({ visible: false, user: '', coins: 0 });

  // 1. Chú cún vàng lon ton trên mặt đường phía dưới
  const [puppyState, setPuppyState] = useState({
    x: 200,
    dir: 1, // 1: đi phải, -1: đi trái
    isSniffing: false,
    isExcited: false
  });

  // 2. Khách đứng xem hàng và mua sắm tại các sạp 2 bên (Không đứng 1 hàng)
  const [stallBrowsers, setStallBrowsers] = useState(INITIAL_BROWSERS);

  // 3. Người đi bộ "ĐI RA ĐI VÔ" theo chiều sâu 3D của con phố
  const [depthWalkers, setDepthWalkers] = useState(INITIAL_WALKERS);

  // 4. Người xem vừa vào live / vừa donate đang sải bước lại gần bát nhôm
  const [activeViewerWalker, setActiveViewerWalker] = useState(null);
  const viewerTimerRef = useRef(null);

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

  // Auto-scaling 9:16 Stage
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

  // Vòng lặp chuyển động tự nhiên của chú cún con trên mặt đường
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setPuppyState((prev) => {
        if (prev.isSniffing) return prev;

        let nextX = prev.x + prev.dir * 48 * delta;
        let nextDir = prev.dir;

        // Đổi hướng khi chạm lề đường
        if (nextX > 860) {
          nextX = 860;
          nextDir = -1;
        } else if (nextX < 140) {
          nextX = 140;
          nextDir = 1;
        }

        // Tỉ lệ nhỏ dừng lại ngửi ngửi gần bát nhôm (khoảng x: 460 - 540)
        if (Math.abs(nextX - 500) < 16 && Math.random() < 0.007) {
          setTimeout(() => {
            setPuppyState((p) => ({ ...p, isSniffing: false }));
          }, 2400);
          return { ...prev, x: nextX, isSniffing: true };
        }

        return { ...prev, x: nextX, dir: nextDir };
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Spawn dropping coins vào chiếc bát nhôm ở mặt đường
  const spawnCoins = useCallback((count = 12) => {
    if (audio) audio.playCoinDrop();
    const newCoins = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newCoins.push({
        id: `coin_${now}_${i}_${Math.random()}`,
        startX: 420 + Math.random() * 240,
        startY: 550 + Math.random() * 300,
        targetX: 540 + (Math.random() - 0.5) * 120,
        targetY: 1560 + (Math.random() - 0.5) * 35,
        delay: i * 0.05,
        rotation: Math.random() * 720
      });
    }
    setCoinsList((prev) => [...prev.slice(-30), ...newCoins]);
    setTimeout(() => {
      setCoinsList((prev) => prev.filter((c) => !newCoins.includes(c)));
    }, 2500);

    // Chú cún nhảy mừng rỡ khi có tiền rơi vào bát
    setPuppyState((p) => ({ ...p, isExcited: true }));
    setTimeout(() => {
      setPuppyState((p) => ({ ...p, isExcited: false }));
    }, 3200);
  }, [audio]);

  // Spawn floating hearts
  const spawnHearts = useCallback((count = 6) => {
    if (audio) audio.playHeartPop();
    const newHearts = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: `heart_${now}_${i}_${Math.random()}`,
        x: 520 + (Math.random() - 0.5) * 220,
        y: 1460 + Math.random() * 60,
        size: 26 + Math.random() * 28,
        color: ['#ff1744', '#f50057', '#ff4081', '#ff5252', '#ff80ab'][i % 5],
        delay: i * 0.07
      });
    }
    setHeartsList((prev) => [...prev.slice(-40), ...newHearts]);
    setTimeout(() => {
      setHeartsList((prev) => prev.filter((h) => !newHearts.includes(h)));
    }, 2200);
  }, [audio]);

  // Kích hoạt người xem vào live / donate: sải bước từ ngõ chợ xuống gần bát nhôm, tương tác rồi đứng mua sắm tại sạp
  const triggerViewerInteraction = useCallback((user, avatar, actionText, actionType = 'greet', amount = 0) => {
    if (viewerTimerRef.current) clearTimeout(viewerTimerRef.current);

    const model = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;

    let chatBubble = '';
    if (actionType === 'greet') {
      chatBubble = 'Chào em, chúc em đông khách! 👋';
    } else if (actionType === 'donate') {
      chatBubble = `Bố thí ${amount || 10}đ để em uống bia nè! 🍺`;
    } else if (actionType === 'heart') {
      chatBubble = `Thả ${amount || 5} tim ủng hộ nha! ❤️`;
    } else if (actionType === 'follow') {
      chatBubble = 'Đã bấm follow kênh ủng hộ em nhé! ➕✨';
    } else if (actionType === 'share') {
      chatBubble = 'Đã chia sẻ live giúp em trai nhé! 🔄✨';
    }

    const walker = {
      id: `viewer_${Date.now()}`,
      name: user || 'Thí Chủ',
      avatar: avatar || '',
      avatarBg: getAvatarColor(user),
      model,
      dir,
      actionText,
      actionType,
      coins: actionType === 'donate' ? amount : 0,
      count: actionType === 'heart' ? amount : 0,
      chatBubble
    };

    setActiveViewerWalker(walker);

    // Sau khi tương tác ở bát nhôm (8s), cập nhật vào một sạp chợ làm khách quen
    viewerTimerRef.current = setTimeout(() => {
      setStallBrowsers((prev) => {
        const targetIdx = Math.floor(Math.random() * prev.length);
        const updated = [...prev];
        updated[targetIdx] = {
          ...updated[targetIdx],
          name: user,
          avatar: avatar || '',
          avatarBg: getAvatarColor(user),
          chat: chatBubble,
          metricText: actionType === 'donate' ? `🪙 +${amount}đ` : actionType === 'heart' ? `❤️ +${amount}` : actionType === 'follow' ? '➕ FOLLOW' : actionType === 'share' ? '🔄 SHARE' : '🌸 VÀO'
        };
        return updated;
      });
      setActiveViewerWalker(null);
    }, 8000);
  }, []);

  // Luân chuyển người đi bộ chiều sâu & qua lại liên tục 3D
  const handleWalkerEnd = useCallback((walker) => {
    setDepthWalkers((prev) => {
      return prev.map((w) => {
        if (w.id !== walker.id) return w;
        const routeObj = DEPTH_ROUTES[Math.floor(Math.random() * DEPTH_ROUTES.length)];
        const newModel = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];
        const newName = AMBIENT_NAMES[Math.floor(Math.random() * AMBIENT_NAMES.length)];
        const newChat = Math.random() < 0.5 ? AMBIENT_CHATS[Math.floor(Math.random() * AMBIENT_CHATS.length)] : null;
        return {
          ...w,
          cycle: (w.cycle || 0) + 1,
          model: newModel,
          name: newName,
          route: routeObj.route,
          duration: routeObj.duration + (Math.random() * 2 - 1),
          delay: 0,
          dir: routeObj.dir,
          chat: newChat
        };
      });
    });
  }, []);

  // Khách xem hàng tại các sạp thỉnh thoảng quay người hoặc phát ngôn
  useEffect(() => {
    const interval = setInterval(() => {
      setStallBrowsers((prev) => {
        if (!prev.length) return prev;
        const targetIdx = Math.floor(Math.random() * prev.length);
        const updated = [...prev];
        const target = updated[targetIdx];
        const flipDir = Math.random() < 0.35 ? target.dir * -1 : target.dir;
        const newChat = Math.random() < 0.5 ? AMBIENT_CHATS[Math.floor(Math.random() * AMBIENT_CHATS.length)] : null;
        updated[targetIdx] = {
          ...target,
          dir: flipDir,
          chat: newChat
        };
        return updated;
      });
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  // Handle active events from Server
  useEffect(() => {
    if (!activeEvent || activeEvent.id === processedEventIdRef.current) return;
    processedEventIdRef.current = activeEvent.id;

    const user = activeEvent.user || 'Thí Chủ';
    const avatar = activeEvent.avatar || '';

    // Enqueue TTS
    if (activeEvent.ttsText && audio) {
      audio.enqueueTts(activeEvent.ttsText, {
        voice: activeEvent.ttsVoice || 'maichi'
      });
    }

    // Trigger actions based on event type
    if (activeEvent.type === 'bothiDonate' || activeEvent.type === 'offerGift' || activeEvent.type === 'grandCeremony') {
      const coins = activeEvent.coins || 10;
      setSpeech({
        user,
        avatar,
        text: `Dạ em cảm ơn anh/chị ${user} đã bố thí ${coins} đồng! Có tiền uống bia rồi 🍻🥰`,
        isHappy: true
      });
      setKidMood('cheering');
      spawnCoins(Math.min(24, Math.max(8, Math.round(coins / 2))));
      triggerViewerInteraction(user, avatar, `🪙 Bố thí ${coins}đ!`, 'donate', coins);

      if (coins >= 20) {
        if (audio) audio.playBeerCheers();
        setCheersBanner({ visible: true, user, coins });
        setTimeout(() => setCheersBanner({ visible: false, user: '', coins: 0 }), 5000);
      }

      setTimeout(() => {
        setKidMood('crying');
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng hoặc thả tim để có tiền uống bia! 🍺🙏',
          isHappy: false
        }));
      }, 9000);
    } else if (activeEvent.type === 'bothiHeart' || activeEvent.type === 'strikeWoodenFish') {
      const count = activeEvent.count || 5;
      setSpeech({
        user,
        avatar,
        text: `Dạ em cảm ơn anh/chị ${user} đã thả ${count} tim ủng hộ em! Có tiền uống bia rồi ❤️🍺`,
        isHappy: true
      });
      setKidMood('cheering');
      spawnHearts(Math.min(15, count));
      triggerViewerInteraction(user, avatar, `❤️ Thả ${count} tim!`, 'heart', count);

      setTimeout(() => {
        setKidMood('crying');
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để có tiền uống bia! 🍺🙏',
          isHappy: false
        }));
      }, 7000);
    } else if (activeEvent.type === 'bothiFollow' || activeEvent.type === 'templeFollow') {
      // User followed the live channel
      setSpeech({
        user,
        avatar,
        text: `Dạ em cảm ơn anh/chị ${user} đã follow kênh! Yêu thương nhiều lắm ạ 🥰🍺`,
        isHappy: true
      });
      setKidMood('cheering');
      spawnHearts(10);
      triggerViewerInteraction(user, avatar, '➕ Đã Follow!', 'follow', 0);

      setTimeout(() => {
        setKidMood('crying');
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để có tiền uống bia! 🍺🙏',
          isHappy: false
        }));
      }, 7500);
    } else if (activeEvent.type === 'bothiShare' || activeEvent.type === 'templeShare') {
      // User shared the live stream
      setSpeech({
        user,
        avatar,
        text: `Dạ em cảm ơn anh/chị ${user} đã chia sẻ live giúp em! Yêu thương nhiều lắm ạ 🥰🔄`,
        isHappy: true
      });
      setKidMood('cheering');
      spawnHearts(10);
      triggerViewerInteraction(user, avatar, '🔄 Đã Share!', 'share', 0);

      setTimeout(() => {
        setKidMood('crying');
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để có tiền uống bia! 🍺🙏',
          isHappy: false
        }));
      }, 7500);
    } else if (activeEvent.type === 'bothiGreet' || activeEvent.type === 'burnIncense') {
      // User entered live
      setSpeech({
        user,
        avatar,
        text: `Chào ${user}, nhờ anh chị cho em xin vài đồng, tim hoặc bấm follow để đi uống bia 🍺🙏`,
        isHappy: false
      });
      setKidMood('greeting');
      spawnHearts(3);
      triggerViewerInteraction(user, avatar, '👋 Vừa vào Live!', 'greet', 0);

      setTimeout(() => {
        setKidMood('crying');
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để có tiền uống bia! 🍺🙏',
          isHappy: false
        }));
      }, 8500);
    }
  }, [activeEvent, audio, spawnCoins, spawnHearts, triggerViewerInteraction]);

  // Handle manual clicks on hotspots
  const handleSignClick = () => {
    // Luân phiên thả tim, follow hoặc share khi người dùng bấm vào biển carton
    const roll = Math.random();
    if (roll < 0.34) {
      callRpc('temple.follow', {
        user: speech.user !== 'Anh/Chị' ? speech.user : 'Bạn Hữu',
        readTts: true
      });
    } else if (roll < 0.67) {
      callRpc('temple.share', {
        user: speech.user !== 'Anh/Chị' ? speech.user : 'Bạn Hữu',
        readTts: true
      });
    } else {
      callRpc('temple.strikeWoodenFish', {
        user: speech.user !== 'Anh/Chị' ? speech.user : 'Bạn Hữu',
        count: 10,
        readTts: true
      });
    }
  };

  const leaderboard = state?.leaderboard || [];
  const totalBeer = state?.totalBeerMoney || 0;
  const totalHearts = state?.totalHearts || 0;
  const totalFollows = state?.totalFollows || 0;
  const totalShares = state?.totalShares || 0;

  return (
    <div className={`stage-wrapper bothi-stage-wrapper ${obsMode ? 'obs-mode' : ''}`} ref={stageWrapperRef}>
      <div className="stage-9x16 bothi-stage-container" ref={stage9x16Ref}>
        {/* 1. HÌNH NỀN PHỐ CHỢ 3D PIXAR SẠCH SẼ, RỘNG RÃI */}
        <div className="bothi-background-layer">
          <img
            src={marketBgImg}
            alt="Phố Chợ Việt Nam 3D"
            className="bothi-bg-image"
            onError={(e) => {
              e.currentTarget.src = '/assets/market_street_clean.jpg';
            }}
          />
          <div className="market-ambient-glow" />
        </div>

        {/* 2. CẬU BÉ KHẤT THỰC XIN BIA (NGỒI XUỐNG THẤP TRÊN MẶT ĐƯỜNG ĐÁ) */}
        <div className={`central-beggar-character mood-${kidMood}`}>
          <img
            src={beggarKidImg}
            alt="Cậu Bé Xin Tiền Uống Bia"
            className="beggar-kid-sprite"
          />

          {/* Dòng nước mắt long lanh chảy từ mắt cu cậu */}
          {kidMood === 'crying' && (
            <div className="beggar-live-tears">
              <span className="live-tear tear-left" />
              <span className="live-tear tear-right" />
              <span className="tear-splash splash-left" />
              <span className="tear-splash splash-right" />
            </div>
          )}

          {/* Biểu cảm hân hoan khi có tiền uống bia */}
          {kidMood === 'cheering' && (
            <div className="beggar-cheer-bubble">
              <span className="beer-toast-icon">🍻</span>
              <span className="cheer-text">Có Tiền Uống Bia Rồi!</span>
            </div>
          )}
        </div>

        {/* 3. TẤM BÌA CARTON CHÂN THỰC ĐẶT TRƯỚC ĐẦU GỐI CẬU BÉ */}
        <div
          className="cardboard-sign-container"
          title="Bấm vào tấm bìa để Thả Tim hoặc Follow ủng hộ"
          onClick={handleSignClick}
        >
          <div className="cardboard-board">
            <div className="cardboard-texture" />
            <div className="tape-corner tape-tl" />
            <div className="tape-corner tape-tr" />
            <div className="cardboard-heart-decor decor-l">❤️</div>
            <div className="cardboard-heart-decor decor-r">➕</div>

            <div className="cardboard-text-lines">
              <div className="line-1">
                NHỜ ANH/CHỊ VỪA VÀO <span className="highlight-live">LIVE</span>
              </div>
              <div className="line-2">
                CHO EM XIN VÀI ĐỒNG
              </div>
              <div className="line-3">
                <span className="highlight-heart">TIM ❤️</span> • <span className="highlight-follow">FOLLOW ➕</span> • <span className="highlight-share">SHARE 🔄</span>
              </div>
              <div className="line-4">
                ĐỂ CÓ TIỀN UỐNG BIA! <span className="sign-beer-badge">🍺🙏</span>
              </div>
            </div>
          </div>
          <div className="cardboard-shadow" />
        </div>



        {/* 5. CHÚ CÚN CON VÀNG LON TON TRÊN ĐƯỜNG PHỐ */}
        <div
          className={`street-puppy-wrapper ${puppyState.dir === 1 ? 'face-right' : 'face-left'} ${puppyState.isExcited ? 'puppy-jump' : ''}`}
          style={{ left: `${puppyState.x}px` }}
        >
          {puppyState.isSniffing && <div className="puppy-thought-bubble">Gâu gâu! 🦴</div>}
          <svg viewBox="0 0 120 90" className="cute-puppy-svg">
            <path className="puppy-tail" d="M22,50 Q10,35 15,22 Q20,35 28,45 Z" fill="#c97d32" />
            <ellipse className="leg back-leg-1" cx="35" cy="74" rx="7" ry="12" fill="#d88b3d" />
            <ellipse className="leg back-leg-2" cx="48" cy="76" rx="6" ry="11" fill="#b96e26" />
            <ellipse cx="56" cy="52" rx="28" ry="18" fill="#e89c48" />
            <ellipse className="leg front-leg-1" cx="72" cy="75" rx="7" ry="12" fill="#d88b3d" />
            <ellipse className="leg front-leg-2" cx="84" cy="77" rx="6" ry="11" fill="#b96e26" />
            <rect x="74" y="38" width="8" height="14" rx="3" fill="#e53935" transform="rotate(-15 78 45)" />
            <circle cx="76" cy="51" r="3.5" fill="#ffd700" />
            <circle cx="85" cy="34" r="18" fill="#f2a855" />
            <ellipse cx="98" cy="38" rx="10" ry="8" fill="#fce4cc" />
            <ellipse cx="102" cy="35" rx="4" ry="3" fill="#3e2723" />
            <circle cx="90" cy="29" r="3.5" fill="#212121" />
            <circle cx="91.5" cy="27.5" r="1.3" fill="#ffffff" />
            <path className="puppy-ear" d="M74,22 C68,14 62,28 68,38 C72,42 78,35 76,24 Z" fill="#b96e26" />
          </svg>
        </div>

        {/* 6. HỆ THỐNG ĐÁM ĐÔNG PHỐ CHỢ 3D: KHÁCH XEM SẠP & ĐI BỘ CHIỀU SÂU ĐA SẮC MÀU */}
        <div className="bothi-crowd-layer">
          {/* A. Khách đứng xem hàng và mua sắm tại các sạp 2 bên (Độ cao & chiều sâu đa dạng) */}
          {stallBrowsers.map((b) => (
            <div
              key={b.id}
              className="stall-browser"
              style={{
                left: `${b.x}px`,
                top: `${b.y}px`,
                zIndex: b.zIndex,
                '--browser-scale': b.scale
              }}
            >
              <div className="walker-head-badge">
                {b.chat && (
                  <div className="walker-chat-bubble">
                    <span>{b.chat}</span>
                    <div className="chat-bubble-tail" />
                  </div>
                )}
                <div className="walker-capsule-badge">
                  <div className="capsule-avatar-ring">
                    {b.avatar ? (
                      <img src={b.avatar} alt="" className="capsule-avatar-img" />
                    ) : (
                      <div className="capsule-avatar-fallback" style={{ background: b.avatarBg || getAvatarColor(b.name) }}>
                        {b.name ? b.name.slice(0, 1).toUpperCase() : '✨'}
                      </div>
                    )}
                    <span className="capsule-live-dot" />
                  </div>
                  <span className="capsule-username">@{b.name}</span>
                  <div className="capsule-metric-pill pill-ambient">
                    <span>🌸</span><strong>{b.metricText || 'DẠO PHỐ'}</strong>
                  </div>
                </div>
              </div>

              <div className="walker-sprite-container" style={{ transform: b.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}>
                <img
                  src={getSpriteImage(b.model)}
                  alt={b.name}
                  className="browser-sprite-img"
                  onError={(e) => {
                    e.currentTarget.src = manYellowImg;
                  }}
                />
              </div>
            </div>
          ))}

          {/* B. Người đi bộ "ĐI RA ĐI VÔ" theo chiều sâu 3D của con phố */}
          {depthWalkers.map((w) => (
            <div
              key={`${w.id}_${w.cycle || 0}`}
              className={`depth-walker ${w.route}`}
              style={{
                animationDuration: `${w.duration}s`,
                animationDelay: w.delay ? `${w.delay}s` : '0s'
              }}
              onAnimationEnd={() => handleWalkerEnd(w)}
            >
              <div className="walker-head-badge">
                {w.chat && (
                  <div className="walker-chat-bubble">
                    <span>{w.chat}</span>
                    <div className="chat-bubble-tail" />
                  </div>
                )}
                <div className="walker-capsule-badge">
                  <div className="capsule-avatar-ring">
                    {w.avatar ? (
                      <img src={w.avatar} alt="" className="capsule-avatar-img" />
                    ) : (
                      <div className="capsule-avatar-fallback" style={{ background: w.avatarBg || getAvatarColor(w.name) }}>
                        {w.name ? w.name.slice(0, 1).toUpperCase() : '✨'}
                      </div>
                    )}
                    <span className="capsule-live-dot" />
                  </div>
                  <span className="capsule-username">@{w.name}</span>
                  <div className="capsule-metric-pill pill-ambient">
                    <span>🌸</span><strong>{w.metricText || 'DẠO PHỐ'}</strong>
                  </div>
                </div>
              </div>

              <div className="walker-bob-box" style={{ transform: w.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}>
                <img
                  src={getSpriteImage(w.model)}
                  alt={w.name}
                  className="depth-sprite-img"
                  onError={(e) => {
                    e.currentTarget.src = manYellowImg;
                  }}
                />
              </div>
            </div>
          ))}

          {/* C. Người xem vừa vào Live / vừa Donate sải bước lại gần bát nhôm */}
          {activeViewerWalker && (
            <div
              key={activeViewerWalker.id}
              className="viewer-to-bowl-walker"
            >
              <div className="walker-head-badge">
                {activeViewerWalker.chatBubble && (
                  <div className="walker-chat-bubble viewer-speech">
                    <span>{activeViewerWalker.chatBubble}</span>
                    <div className="chat-bubble-tail" />
                  </div>
                )}

                <div className="walker-capsule-badge capsule-gold-glow">
                  <div className="capsule-avatar-ring">
                    {activeViewerWalker.avatar ? (
                      <img src={activeViewerWalker.avatar} alt="" className="capsule-avatar-img" />
                    ) : (
                      <div className="capsule-avatar-fallback" style={{ background: activeViewerWalker.avatarBg }}>
                        {activeViewerWalker.name ? activeViewerWalker.name.slice(0, 1).toUpperCase() : '✨'}
                      </div>
                    )}
                    <span className="capsule-live-dot" />
                  </div>

                  <span className="capsule-username">@{activeViewerWalker.name}</span>

                  <div className={`capsule-metric-pill pill-${activeViewerWalker.actionType || 'greet'}`}>
                    {activeViewerWalker.actionType === 'donate' ? (
                      <><span>🪙</span><strong>+{activeViewerWalker.coins}đ</strong></>
                    ) : activeViewerWalker.actionType === 'heart' ? (
                      <><span>❤️</span><strong>+{activeViewerWalker.count}</strong></>
                    ) : activeViewerWalker.actionType === 'follow' ? (
                      <><span>➕</span><strong>FOLLOW</strong></>
                    ) : activeViewerWalker.actionType === 'share' ? (
                      <><span>🔄</span><strong>SHARE</strong></>
                    ) : (
                      <><span>👋</span><strong>VÀO LIVE</strong></>
                    )}
                  </div>
                </div>
              </div>

              <div className="walker-bob-box" style={{ transform: activeViewerWalker.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}>
                <img
                  src={getSpriteImage(activeViewerWalker.model)}
                  alt={activeViewerWalker.name}
                  className="viewer-sprite-img"
                  onError={(e) => {
                    e.currentTarget.src = manYellowImg;
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. THANH TRẠNG THÁI MỎNG TRÊN ĐỈNH */}
        <header className="minimal-top-bar bothi-top-bar">
          <div className="live-pill">
            <span className={`live-dot ${state?.tiktok?.connected ? 'connected' : ''}`} />
            <span>
              {state?.tiktok?.connected
                ? `LIVE @${state.tiktok.username}`
                : state?.settings?.autoSim
                ? 'CHẾ ĐỘ BỐ THÍ • TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI'
                : 'CHẾ ĐỘ BỐ THÍ • XIN TIỀN UỐNG BIA 🍺'}
            </span>
          </div>
          {currentTrack && (
            <div
              className="phongsinh-music-pill"
              title="Click để chuyển bài tiếp theo"
              onClick={() => audio?.nextPhongsinhTrack?.()}
              style={{ cursor: 'pointer', maxWidth: '380px', fontSize: '14px', padding: '4px 14px' }}
            >
              <span className="phongsinh-music-icon">🎵</span>
              <span className="phongsinh-music-text">{currentTrack.title} – {currentTrack.artist}</span>
              <span className="phongsinh-music-skip">⏭️</span>
            </div>
          )}

          <div className="top-Right-badges">
            <div className="mini-stat-pill bothi-stat-pill">
              🍺 <strong>{totalBeer.toLocaleString('vi-VN')}</strong> đ tiền bia • ❤️ <strong>{totalHearts.toLocaleString('vi-VN')}</strong> tim
            </div>
          </div>
        </header>

        {/* 8. BẢNG TOP MẠNH THƯỜNG QUÂN BỐ THÍ */}
        <div className="bothi-leaderboard-card">
          <div className="bothi-lb-title">🏆 TOP BỐ THÍ UỐNG BIA</div>
          <div className="bothi-lb-list">
            {leaderboard.slice(0, 5).map((dev, idx) => (
              <div key={dev.uniqueId || idx} className="bothi-lb-item">
                <span className={`bothi-lb-rank rank-${idx + 1}`}>#{idx + 1}</span>
                <span className="bothi-lb-name">{dev.name.length > 13 ? dev.name.slice(0, 13) + '..' : dev.name}</span>
                <span className="bothi-lb-merit">🍺 {dev.merit} đ</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="bothi-lb-empty">Chưa có thí chủ bố thí...</div>
            )}
          </div>
        </div>

        {/* 9. BÓNG THOẠI KHẨN CẦU (ĐẶT NGAY TRÊN ĐẦU CẬU BÉ, CHỈ XUỐNG ĐẦU CU CẬU) */}
        <div className={`bothi-speech-bubble ${speech.isHappy ? 'is-happy' : ''}`}>
          <div className="bubble-content">
            <div className="bubble-user-badge">
              <span className="bubble-avatar">
                {speech.avatar ? <img src={speech.avatar} alt="" /> : '🥺'}
              </span>
              <span className="bubble-user-name">@{speech.user}</span>
              {speech.isHappy && <span className="bubble-beer-cheer">🍻 Tiền về!</span>}
            </div>
            <div className="bubble-text">“{speech.text}”</div>
          </div>
          <div className="bubble-tail" />
        </div>

        {/* 10. HIỆU ỨNG TIỀN RƠI VÀO BÁT NHÔM (FALLING COINS) */}
        <div className="bothi-coins-layer">
          {coinsList.map((coin) => (
            <div
              key={coin.id}
              className="falling-gold-coin"
              style={{
                '--start-x': `${coin.startX}px`,
                '--start-y': `${coin.startY}px`,
                '--target-x': `${coin.targetX}px`,
                '--target-y': `${coin.targetY}px`,
                '--rot': `${coin.rotation}deg`,
                animationDelay: `${coin.delay}s`
              }}
            >
              🪙
            </div>
          ))}
        </div>

        {/* 11. HIỆU ỨNG TIM BAY (FLOATING HEARTS) */}
        <div className="bothi-hearts-layer">
          {heartsList.map((h) => (
            <div
              key={h.id}
              className="floating-heart"
              style={{
                left: `${h.x}px`,
                top: `${h.y}px`,
                fontSize: `${h.size}px`,
                color: h.color,
                animationDelay: `${h.delay}s`
              }}
            >
              ❤️
            </div>
          ))}
        </div>

        {/* 12. BANNER CHÚC MỪNG MẠNH THƯỜNG QUÂN (ĐẠI LỄ TIỀN VỀ UỐNG BIA) */}
        {cheersBanner.visible && (
          <div className="bothi-cheers-banner">
            <div className="cheers-banner-inner">
              <div className="cheers-beer-icons">🍻 🎉 🍻</div>
              <div className="cheers-title">CẢM ƠN MẠNH THƯỜNG QUÂN!</div>
              <div className="cheers-name">{cheersBanner.user}</div>
              <div className="cheers-desc">
                Đã bố thí <strong>{cheersBanner.coins} đồng</strong> để em có tiền đi uống bia!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
