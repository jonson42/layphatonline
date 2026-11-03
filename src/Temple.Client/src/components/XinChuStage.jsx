import React, { useEffect, useRef, useState, useCallback } from 'react';
import marketBgImg from '../assets/market_street_clean.jpg';
import thayBoiImg from '../assets/ong_do_calligrapher.png';

// 6 Nhân vật 3D Pixar đa dạng màu áo và quần riêng biệt
import manYellowImg from '../assets/pedestrian_man_yellow.png';
import girlBlueImg from '../assets/pedestrian_girl_blue.png';
import manOrangeImg from '../assets/pedestrian_man_orange.png';
import girlPurpleImg from '../assets/pedestrian_girl_purple.png';
import boyGreenImg from '../assets/pedestrian_boy.png';
import girlPinkImg from '../assets/pedestrian_girl.png';

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
  'Bác Ba Bói Quẻ',
  'Chị Tư Đi Hội',
  'Anh Bảy Xem Tướng',
  'Bé Mai Cầu May',
  'Cô Năm Cầu Tài',
  'Chú Tư Ghé Bói',
  'Lan Anh',
  'Hoàng Long',
  'Thu Trang',
  'Hồng Phúc'
];

const AMBIENT_CHATS = [
  'Thầy bói phán chuẩn quá! 🔮',
  'Cho em xin một chữ Tài buôn bán! 💰',
  'Năm mới chúc mọi người an khang! ✨',
  'Bói quẻ giải hạn cầu may! 🧧',
  'Thầy giải quẻ rất có tâm! 🙏',
  'Phố hội xuân đông vui quá! 🏮',
  'Chúc thầy bói vạn sự hanh thông! 🕊️'
];

const INITIAL_BROWSERS = [
  {
    id: 'br_1',
    name: 'Diệu Thảo Tâm An',
    avatar: '',
    model: 'girl_blue',
    x: 75,
    y: 1140,
    scale: 0.88,
    zIndex: 36,
    dir: 1,
    chat: 'Thầy bói phán chuẩn quá! 🔮',
    metricText: '📜 CHỮ AN'
  },
  {
    id: 'br_2',
    name: 'Trần Minh Quân',
    avatar: '',
    model: 'man_orange',
    x: 235,
    y: 975,
    scale: 0.65,
    zIndex: 22,
    dir: 1,
    chat: 'Thầy giải quẻ rất có tâm! 🙏',
    metricText: '📜 CHỮ LỘC'
  },
  {
    id: 'br_3',
    name: 'Phạm Thanh Hà',
    avatar: '',
    model: 'girl_purple',
    x: 765,
    y: 975,
    scale: 0.65,
    zIndex: 22,
    dir: -1,
    chat: 'Bói quẻ giải hạn cầu may! 🧧',
    metricText: '📜 CHỮ TÀI'
  },
  {
    id: 'br_4',
    name: 'Lê Hoàng Nam',
    avatar: '',
    model: 'man_yellow',
    x: 915,
    y: 1140,
    scale: 0.88,
    zIndex: 36,
    dir: -1,
    chat: 'Thầy bói hạ bút như rồng múa! 🐉',
    metricText: '👑 TOP 1'
  }
];

const DEPTH_ROUTES = [
  { route: 'route-depth-out-left', duration: 11.5, dir: 1 },
  { route: 'route-depth-in-right', duration: 12.5, dir: -1 },
  { route: 'route-depth-out-right', duration: 11.0, dir: -1 },
  { route: 'route-depth-in-left', duration: 12.0, dir: 1 },
  { route: 'route-cross-mid', duration: 13.5, dir: 1 }
];

const INITIAL_WALKERS = [
  {
    id: 'dw_1',
    name: 'Vũ Đức Thịnh',
    avatar: '',
    model: 'boy_green',
    route: 'route-depth-out-left',
    duration: 11.5,
    dir: 1,
    chat: 'Nhờ thầy bói đoán quẻ làm ăn! 🔮',
    metricText: 'BÓI QUẺ'
  },
  {
    id: 'dw_2',
    name: 'Ngọc Anh Nguyễn',
    avatar: '',
    model: 'girl_pink',
    route: 'route-depth-in-right',
    duration: 12.5,
    dir: -1,
    chat: 'Năm mới vạn sự cát tường! ✨',
    metricText: 'DU XUÂN'
  },
  {
    id: 'dw_3',
    name: 'Bác Ba Bói Quẻ',
    avatar: '',
    model: 'man_yellow',
    route: 'route-depth-out-right',
    duration: 11.0,
    dir: -1,
    chat: 'Thầy bói đoán trọn quẻ linh nghiệm! 🔮',
    metricText: 'DU XUÂN'
  },
  {
    id: 'dw_4',
    name: 'Chị Tư Đi Hội',
    avatar: '',
    model: 'girl_blue',
    route: 'route-cross-mid',
    duration: 13.5,
    dir: 1,
    chat: 'Phố chợ đông vui quá! 🏮',
    metricText: 'DU XUÂN'
  }
];

export default function XinChuStage({ state, activeEvent, audio, callRpc, obsMode }) {
  const stageWrapperRef = useRef(null);
  const stage9x16Ref = useRef(null);
  const processedEventIdRef = useRef(null);

  // Dialogue banner state inspired by reference image
  const [speech, setSpeech] = useState({
    user: 'Anh/Chị',
    avatar: '',
    text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
    isHighlight: false
  });

  // Current active divination scroll
  const [activeScroll, setActiveScroll] = useState({
    visible: true,
    user: 'Thí Chủ Hảo Tâm',
    avatar: '',
    word: 'CÁT TƯỜNG',
    hexTitle: 'Quẻ Thượng Cát • Thuận Buồm Xuôi Gió',
    intent: 'Cầu kinh doanh hồng phát & gia đạo bình an',
    meaning: 'Chữ CÁT TƯỜNG tụ khí sinh tài, bốn mùa bình an thịnh vượng. Mưu sự khởi đầu thuận lợi, ắt gặp quý nhân phù trợ.',
    advice: 'Nên chọn ngày giờ hoàng đạo, giữ tâm thành ý thiện; tránh nóng vội trong việc lớn.',
    giftInfo: ''
  });

  // Interactive Form on Stage for viewer/streamer to submit deed + word
  const [showForm, setShowForm] = useState(false);
  const [formUser, setFormUser] = useState('Thí Chủ Hảo Tâm');
  const [formIntent, setFormIntent] = useState('Chuẩn bị mở quán buôn bán');
  const [formWord, setFormWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Floating effects
  const [fallingPetals, setFallingPetals] = useState([]);
  const [coinsList, setCoinsList] = useState([]);
  const [heartsList, setHeartsList] = useState([]);

  // Pedestrians & viewers
  const [stallBrowsers, setStallBrowsers] = useState(INITIAL_BROWSERS);
  const [depthWalkers, setDepthWalkers] = useState(INITIAL_WALKERS);
  const [activeViewerWalker, setActiveViewerWalker] = useState(null);
  const viewerTimerRef = useRef(null);

  // Background audio playlist tracking (22 tracks)
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

  // Gentle falling petals loop (Hoa đào / hoa mai rơi)
  useEffect(() => {
    const interval = setInterval(() => {
      const id = `petal_${Date.now()}_${Math.random()}`;
      const startX = 60 + Math.random() * 960;
      const duration = 6.5 + Math.random() * 4.5;
      const size = 18 + Math.random() * 16;
      const icons = ['🌸', '🌸', '🌼', '✨', '🍃'];
      const icon = icons[Math.floor(Math.random() * icons.length)];

      setFallingPetals((prev) => [
        ...prev.slice(-30),
        { id, startX, duration, size, icon }
      ]);

      setTimeout(() => {
        setFallingPetals((p) => p.filter((item) => item.id !== id));
      }, duration * 1000);
    }, 550);

    return () => clearInterval(interval);
  }, []);

  // Spawn dropping coins
  const spawnCoins = useCallback((count = 12) => {
    if (audio) audio.playCoinDrop();
    const newCoins = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newCoins.push({
        id: `coin_${now}_${i}_${Math.random()}`,
        startX: 420 + Math.random() * 240,
        startY: 550 + Math.random() * 300,
        targetX: 540 + (Math.random() - 0.5) * 160,
        targetY: 1520 + (Math.random() - 0.5) * 40,
        delay: i * 0.05,
        rotation: Math.random() * 720
      });
    }
    setCoinsList((prev) => [...prev.slice(-30), ...newCoins]);
    setTimeout(() => {
      setCoinsList((prev) => prev.filter((c) => !newCoins.includes(c)));
    }, 2500);
  }, [audio]);

  // Spawn floating hearts
  const spawnHearts = useCallback((count = 6) => {
    if (audio) audio.playHeartPop();
    const newHearts = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: `heart_${now}_${i}_${Math.random()}`,
        x: 540 + (Math.random() - 0.5) * 220,
        y: 1350 + Math.random() * 60,
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

  // Kích hoạt người xem vào live / bói quẻ sải bước lại gần bàn Thầy Bói
  const triggerViewerInteraction = useCallback((user, avatar, actionText, actionType = 'greet', amount = 0, word = '') => {
    if (viewerTimerRef.current) clearTimeout(viewerTimerRef.current);

    const model = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;

    let chatBubble = '';
    if (actionType === 'greet') {
      chatBubble = 'Kính chào Thầy Bói, nhờ thầy đoán giúp em một quẻ ạ! 🔮🙏';
    } else if (actionType === 'donate') {
      chatBubble = `Gieo duyên ${amount || 10} đồng! Thầy bói quẻ & viết chữ giải hạn ạ! 🔮🌸`;
    } else if (actionType === 'heart') {
      chatBubble = `Thả tim trợ duyên thầy bói! Cho em xin quẻ giải hạn nhé! ❤️`;
    } else if (actionType === 'follow') {
      chatBubble = 'Đã follow kênh! Thầy bói quẻ cho em một chữ may mắn nhé! ➕✨';
    } else if (actionType === 'share') {
      chatBubble = 'Đã chia sẻ live xem bói đầu xuân đến bạn bè! 🔄📜';
    } else {
      chatBubble = `Em nhờ Thầy Bói đoán quẻ chữ ${word || 'TÀI'} ạ! 🔮✨`;
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
          metricText: word ? `🔮 CHỮ ${word}` : actionType === 'donate' ? `🪙 +${amount}đ` : '🌸 BÓI QUẺ'
        };
        return updated;
      });
      setActiveViewerWalker(null);
    }, 8000);
  }, []);

  // Luân chuyển người đi bộ chiều sâu 3D
  const handleWalkerEnd = useCallback((walker) => {
    setDepthWalkers((prev) => {
      return prev.map((w) => {
        if (w.id !== walker.id) return w;
        const routeObj = DEPTH_ROUTES[Math.floor(Math.random() * DEPTH_ROUTES.length)];
        const newModel = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];
        const newName = AMBIENT_NAMES[Math.floor(Math.random() * AMBIENT_NAMES.length)];
        const newChat = Math.random() < 0.45 ? AMBIENT_CHATS[Math.floor(Math.random() * AMBIENT_CHATS.length)] : null;
        return {
          ...w,
          cycle: (w.cycle || 0) + 1,
          model: newModel,
          name: newName,
          route: routeObj.route,
          duration: routeObj.duration + (Math.random() * 2 - 1),
          dir: routeObj.dir,
          chat: newChat
        };
      });
    });
  }, []);

  // Khách xem hàng thỉnh thoảng quay người hoặc phát ngôn
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

  // Xử lý sự kiện từ Server & Gemini AI
  useEffect(() => {
    if (!activeEvent || activeEvent.id === processedEventIdRef.current) return;
    processedEventIdRef.current = activeEvent.id;

    const user = activeEvent.user || 'Thí Chủ';
    const avatar = activeEvent.avatar || '';

    // Enqueue TTS phát đọc trên phiên live
    if (activeEvent.ttsText && audio) {
      audio.enqueueTts(activeEvent.ttsText, {
        voice: activeEvent.ttsVoice || 'maichi'
      });
    }

    const word = activeEvent.calligraphyWord || 'CÁT TƯỜNG';
    const meaning = activeEvent.calligraphyMeaning || 'Vạn sự hanh thông, phúc lộc song toàn.';
    const hexTitle = activeEvent.hexagramTitle || 'Quẻ Thượng Cát • Vạn Sự Hanh Thông';
    const intent = activeEvent.actionIntent || activeEvent.wish || 'Cầu bình an may mắn';
    const advice = activeEvent.actionAdvice || 'Giữ tâm sáng trí bền, chu toàn ắt gặp quý nhân.';

    if (activeEvent.type === 'xinchuDivination' || activeEvent.type === 'xinchuCalligraphy') {
      setIsSubmitting(false);
      setSpeech({
        user,
        avatar,
        text: `🔮 Thầy bói phán cho ${user}: Với việc "${intent}", thầy khai bút cho chữ "${word}"! ${hexTitle} - ${meaning}`,
        isHighlight: true
      });
      setActiveScroll({
        visible: true,
        user,
        avatar,
        word,
        hexTitle,
        intent,
        meaning,
        advice,
        giftInfo: `🔮 Bói Việc: ${intent}`
      });
      triggerViewerInteraction(user, avatar, `🔮 Bói chữ ${word}`, 'divination', 0, word);

      setTimeout(() => {
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
          isHighlight: false
        }));
      }, 14000);
    } else if (activeEvent.type === 'xinchuGift' || activeEvent.type === 'bothiDonate' || activeEvent.type === 'offerGift') {
      const coins = activeEvent.coins || 10;
      setSpeech({
        user,
        avatar,
        text: `Đa tạ thí chủ ${user} đã gieo duyên ${coins} đồng! Thầy bói quẻ & khai bút tặng chữ ${word} nghênh tài lộc! 🧧✨`,
        isHighlight: true
      });
      setActiveScroll({
        visible: true,
        user,
        avatar,
        word,
        hexTitle,
        intent: 'Gieo duyên công đức',
        meaning,
        advice,
        giftInfo: `🪙 Gieo duyên ${coins} đồng`
      });
      spawnCoins(Math.min(24, Math.max(8, Math.round(coins / 2))));
      triggerViewerInteraction(user, avatar, `🪙 Gieo duyên ${coins}đ!`, 'donate', coins, word);

      setTimeout(() => {
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
          isHighlight: false
        }));
      }, 9500);
    } else if (activeEvent.type === 'xinchuHeart' || activeEvent.type === 'bothiHeart' || activeEvent.type === 'strikeWoodenFish') {
      const count = activeEvent.count || 5;
      setSpeech({
        user,
        avatar,
        text: `Cảm ơn thí chủ ${user} đã thả ${count} tim trợ duyên! Thầy hạ bút đề tặng chữ ${word} cầu bình an may mắn! ❤️📜`,
        isHighlight: true
      });
      setActiveScroll({
        visible: true,
        user,
        avatar,
        word,
        hexTitle,
        intent: 'Thả tim trợ duyên',
        meaning,
        advice,
        giftInfo: `❤️ Thả ${count} tim`
      });
      spawnHearts(Math.min(15, count));
      triggerViewerInteraction(user, avatar, `❤️ Thả ${count} tim!`, 'heart', count, word);

      setTimeout(() => {
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
          isHighlight: false
        }));
      }, 8000);
    } else if (activeEvent.type === 'xinchuFollow' || activeEvent.type === 'bothiFollow' || activeEvent.type === 'templeFollow') {
      setSpeech({
        user,
        avatar,
        text: `Cảm ơn thí chủ ${user} đã bấm follow kết duyên lành! Thầy bói quẻ & tặng chữ ${word} vạn sự như ý! ➕📜`,
        isHighlight: true
      });
      setActiveScroll({
        visible: true,
        user,
        avatar,
        word,
        hexTitle,
        intent: 'Kết duyên lành',
        meaning,
        advice,
        giftInfo: '➕ Đã Follow'
      });
      triggerViewerInteraction(user, avatar, '➕ Đã Follow', 'follow', 0, word);

      setTimeout(() => {
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
          isHighlight: false
        }));
      }, 7500);
    } else if (activeEvent.type === 'xinchuShare' || activeEvent.type === 'bothiShare' || activeEvent.type === 'templeShare') {
      setSpeech({
        user,
        avatar,
        text: `Cảm ơn thí chủ ${user} đã chia sẻ live lan tỏa duyên lành! Thầy tặng chữ ${word} cát tường thịnh vượng! 🔄📜`,
        isHighlight: true
      });
      setActiveScroll({
        visible: true,
        user,
        avatar,
        word,
        hexTitle,
        intent: 'Chia sẻ lan tỏa phước duyên',
        meaning,
        advice,
        giftInfo: '🔄 Đã Chia Sẻ'
      });
      triggerViewerInteraction(user, avatar, '🔄 Đã Chia Sẻ', 'share', 0, word);

      setTimeout(() => {
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
          isHighlight: false
        }));
      }, 7500);
    } else if (activeEvent.type === 'xinchuGreet' || activeEvent.type === 'bothiGreet' || activeEvent.type === 'templeGreet') {
      setSpeech({
        user,
        avatar,
        text: `Thầy Bói kính chào ${user} đã ghé gian hàng xem bói & xin chữ! Chúc thí chủ vạn sự an khang! 🔮🌸`,
        isHighlight: false
      });
      triggerViewerInteraction(user, avatar, '🌸 Ghé Thăm', 'greet', 0);
    }
  }, [activeEvent, audio, spawnCoins, spawnHearts, triggerViewerInteraction]);

  // Gửi việc muốn làm & chữ muốn xin lên Gemini AI
  const handleDivineSubmit = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!callRpc) return;

    const user = formUser.trim() || 'Thí Chủ Hảo Tâm';
    const intent = formIntent.trim() || 'Cầu bình an, tài lộc hanh thông';
    const word = formWord.trim().toUpperCase();

    setIsSubmitting(true);
    setSpeech({
      user,
      avatar: '',
      text: `🔮 Thầy Bói đang bấm quẻ, gửi tâm nguyện "${intent}" lên đấng huyền học Gemini để khai chữ linh ứng...`,
      isHighlight: true
    });

    callRpc('temple.requestCalligraphy', {
      user,
      intent,
      word,
      readTts: true
    }).then(() => {
      setShowForm(false);
    }).catch((err) => {
      console.error('[Divine Error]', err);
      setIsSubmitting(false);
    });
  }, [callRpc, formUser, formIntent, formWord]);

  // Bấm vào gợi ý đáy màn hình để mở form bói quẻ
  const handleOpenForm = useCallback((e) => {
    e.stopPropagation();
    setShowForm((prev) => !prev);
  }, []);

  const handleNextMusic = useCallback((e) => {
    e.stopPropagation();
    if (audio?.nextPhongsinhTrack) {
      audio.nextPhongsinhTrack();
    }
  }, [audio]);

  return (
    <div className={`xinchu-stage-wrapper ${obsMode ? 'is-obs' : ''}`} ref={stageWrapperRef}>
      <div className="xinchu-stage-container" ref={stage9x16Ref}>
        {/* 1. Lớp ảnh nền phố chợ cổ kính */}
        <div className="xinchu-background-layer">
          <img src={marketBgImg} alt="Market Street" className="xinchu-bg-image" />
          <div className="xinchu-ambient-glow" />
        </div>

        {/* 2. Top Bar: Badge chế độ, Thống kê số quẻ đã giải & Trình phát nhạc Phật giáo 22 bài */}
        <div className="top-status-bar xinchu-top-bar">
          <div className="top-left-badges">
            <div className="stat-pill mode-badge xinchu-stat-pill">
              <span className="pill-icon">🔮</span>
              <span className="pill-text">THẦY BÓI ĐOÁN QUẺ & CHO CHỮ</span>
            </div>

            <div className="stat-pill xinchu-stat-pill">
              <span className="pill-icon">🧧</span>
              <span className="pill-val">{(state?.totalCalligraphyWords || 388).toLocaleString()}</span>
              <span className="pill-unit">Quẻ Đã Giải</span>
            </div>
          </div>

          <div className="top-right-badges">
            {currentTrack && (
              <div
                className="stat-pill music-track-pill xinchu-stat-pill"
                onClick={handleNextMusic}
                title="Bấm để chuyển bài kế tiếp (Playlist 22 bài Phật giáo)"
                style={{ cursor: 'pointer' }}
              >
                <span className="pill-icon">🎵</span>
                <span className="pill-text track-title-text" style={{ maxWidth: '175px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.title}
                </span>
                <span className="next-track-icon" style={{ opacity: 0.85, fontSize: '12px', marginLeft: '2px' }}>⏭️</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Khách mua sắm tại sạp 2 bên đường phố */}
        <div className="bothi-crowd-layer">
          {stallBrowsers.map((b) => (
            <div
              key={b.id}
              className="bothi-pedestrian-browser"
              style={{
                left: `${b.x}px`,
                top: `${b.y}px`,
                transform: `scale(${b.scale}) scaleX(${b.dir})`,
                zIndex: b.zIndex
              }}
            >
              {b.chat && (
                <div className="pedestrian-chat-bubble" style={{ transform: `scaleX(${b.dir})` }}>
                  <span>{b.chat}</span>
                </div>
              )}
              <div className="pedestrian-name-tag" style={{ transform: `scaleX(${b.dir})` }}>
                <span className="pedestrian-name">{b.name}</span>
                <span className="pedestrian-metric">{b.metricText}</span>
              </div>
              <img src={getSpriteImage(b.model)} alt={b.name} className="pedestrian-sprite" />
            </div>
          ))}

          {/* Người đi bộ chiều sâu 3D (Đi ra đi vô đường phố) */}
          {depthWalkers.map((w) => (
            <div
              key={`${w.id}_${w.cycle || 0}`}
              className={`depth-walker ${w.route}`}
              style={{
                '--walk-dir': w.dir,
                '--walk-dur': `${w.duration}s`
              }}
              onAnimationEnd={() => handleWalkerEnd(w)}
            >
              <div className="depth-walker-content">
                {w.chat && (
                  <div className="pedestrian-chat-bubble" style={{ transform: `scaleX(${w.dir})` }}>
                    <span>{w.chat}</span>
                  </div>
                )}
                <div className="pedestrian-name-tag" style={{ transform: `scaleX(${w.dir})` }}>
                  <span className="pedestrian-name">{w.name}</span>
                  <span className="pedestrian-metric">{w.metricText}</span>
                </div>
                <img src={getSpriteImage(w.model)} alt={w.name} className="pedestrian-sprite" />
              </div>
            </div>
          ))}

          {/* Người xem vừa vào live / xin chữ sải bước lại gần bàn Thầy Bói */}
          {activeViewerWalker && (
            <div
              className={`active-viewer-walker walk-to-bowl ${activeViewerWalker.dir === -1 ? 'from-right' : 'from-left'}`}
              style={{
                '--viewer-dir': activeViewerWalker.dir,
                zIndex: 42
              }}
            >
              <div className="active-viewer-content">
                {activeViewerWalker.chatBubble && (
                  <div className="pedestrian-chat-bubble active-donor-bubble" style={{ transform: `scaleX(${activeViewerWalker.dir})` }}>
                    <span>{activeViewerWalker.chatBubble}</span>
                  </div>
                )}
                <div className="pedestrian-name-tag active-donor-tag" style={{ transform: `scaleX(${activeViewerWalker.dir})` }}>
                  {activeViewerWalker.avatar ? (
                    <img src={activeViewerWalker.avatar} alt="avatar" className="donor-avatar-mini" />
                  ) : (
                    <div className="donor-avatar-placeholder" style={{ background: activeViewerWalker.avatarBg }}>
                      {activeViewerWalker.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="pedestrian-name">{activeViewerWalker.name}</span>
                  <span className="pedestrian-metric donor-highlight">{activeViewerWalker.actionText}</span>
                </div>
                <img src={getSpriteImage(activeViewerWalker.model)} alt={activeViewerWalker.name} className="pedestrian-sprite donor-sprite" />
              </div>
            </div>
          )}
        </div>

        {/* 4. Hộp thoại lời Thầy Bói (Dialogue Banner) chuẩn theo hình ảnh mẫu */}
        <div className={`xinchu-dialogue-banner ${speech.isHighlight ? 'highlight' : ''}`} onClick={handleOpenForm}>
          <div className="banner-card">
            <div className="banner-user-row">
              <span className="banner-user-tag">
                <span className="user-icon">🔮</span>
                <span>@{speech.user}</span>
              </span>
            </div>
            <div className="banner-message-text">
              <span className="quote-mark">“</span>
              {speech.text}
              <span className="quote-mark">”</span>
            </div>
          </div>
        </div>

        {/* 5. Trục Liễn Thư Pháp & Quẻ Luận Giải từ Thầy Bói (Gemini AI) */}
        {activeScroll.visible && (
          <div className="xinchu-scroll-container" key={`${activeScroll.user}_${activeScroll.word}_${activeScroll.intent}`}>
            <div className="xinchu-scroll-roller-top" />
            <div className="xinchu-scroll-body">
              <div className="scroll-recipient-header">
                {activeScroll.avatar ? (
                  <img src={activeScroll.avatar} alt={activeScroll.user} className="scroll-user-avatar" />
                ) : (
                  <div className="scroll-user-avatar-placeholder">
                    {activeScroll.user.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="scroll-recipient-text">
                  Thầy Bói đoán quẻ cho <strong>{activeScroll.user}</strong>
                </div>
              </div>

              {/* Tâm nguyện / Việc muốn làm */}
              {activeScroll.intent && (
                <div className="scroll-intent-box">
                  Tâm nguyện: <strong>"{activeScroll.intent}"</strong>
                </div>
              )}

              {/* Tên Quẻ Đại Cát */}
              {activeScroll.hexTitle && (
                <div className="scroll-hexagram-pill">
                  <span>🔮 {activeScroll.hexTitle}</span>
                </div>
              )}

              {/* Chữ Thư Pháp Đại Tự */}
              <div className="scroll-calligraphy-char">
                {activeScroll.word}
              </div>

              {/* Lời Luận Giải của Thầy Bói (Gemini AI) */}
              <div className="scroll-meaning-text">
                {activeScroll.meaning}
              </div>

              {/* Kế sách hành động / Lời khuyên */}
              {activeScroll.advice && (
                <div className="scroll-advice-box">
                  <span className="advice-label">💡 LỜI KHUYÊN HÓA GIẢI & ĐÓN LỘC:</span>
                  <span>{activeScroll.advice}</span>
                </div>
              )}

              <div className="scroll-seal-stamp">
                <span>ẤN THẦY BÓI • CÁT TƯỜNG</span>
              </div>
            </div>
            <div className="xinchu-scroll-roller-bottom" />
          </div>
        )}

        {/* 6. Gian hàng Thầy Bói: Sprite Thầy Bói ngồi chõng tre đoán quẻ */}
        <div className="xinchu-master-station" onClick={handleOpenForm}>
          <div className="xinchu-station-aura" />
          <img src={thayBoiImg} alt="Thầy Bói Đoán Quẻ & Cho Chữ" className="xinchu-master-sprite" />
        </div>

        {/* 7. Hiệu ứng cánh hoa đào / hoa mai rơi (Falling Petals) */}
        <div className="xinchu-petals-layer">
          {fallingPetals.map((petal) => (
            <div
              key={petal.id}
              className="falling-petal"
              style={{
                left: `${petal.startX}px`,
                fontSize: `${petal.size}px`,
                animationDuration: `${petal.duration}s`
              }}
            >
              {petal.icon}
            </div>
          ))}
        </div>

        {/* 8. Hiệu ứng tiền xu rơi khi gieo duyên */}
        {coinsList.length > 0 && (
          <div className="bothi-coins-layer">
            {coinsList.map((coin) => (
              <div
                key={coin.id}
                className="falling-beer-coin"
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
        )}

        {/* 9. Hiệu ứng tim bay khi thả tim */}
        {heartsList.length > 0 && (
          <div className="bothi-hearts-layer">
            {heartsList.map((h) => (
              <div
                key={h.id}
                className="floating-heart-item"
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
        )}

        {/* 10. Hộp Nhập Việc Muốn Làm & Chữ Muốn Xin (Popup Card) */}
        {showForm && (
          <div className="thay-boi-input-card" onClick={(e) => e.stopPropagation()}>
            <div className="thay-boi-input-header">
              <span className="thay-boi-input-title">
                <span>🔮</span>
                <span>NHỜ THẦY BÓI ĐOÁN QUẺ & CHO CHỮ (AI GEMINI)</span>
              </span>
              <button className="thay-boi-close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="thay-boi-input-row">
              <div className="thay-boi-field" style={{ flex: '1.2' }}>
                <label>Họ tên thí chủ:</label>
                <input
                  type="text"
                  className="thay-boi-input"
                  value={formUser}
                  onChange={(e) => setFormUser(e.target.value)}
                  placeholder="Ví dụ: Diệu Thảo, Hoàng Long..."
                />
              </div>

              <div className="thay-boi-field" style={{ flex: '0.8' }}>
                <label>Chữ muốn xin (tùy chọn):</label>
                <input
                  type="text"
                  className="thay-boi-input"
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  placeholder="TÀI, ĐỖ, DUYÊN... (hoặc để trống)"
                />
              </div>
            </div>

            <div className="thay-boi-field">
              <label>Việc muốn làm / Dự định / Tâm sự cần giải:</label>
              <input
                type="text"
                className="thay-boi-input"
                value={formIntent}
                onChange={(e) => setFormIntent(e.target.value)}
                placeholder="Ví dụ: Chuẩn bị mở quán trà sữa, thi đại học, tỏ tình crush, xuất ngoại..."
              />
            </div>

            <button
              className="thay-boi-submit-btn"
              disabled={isSubmitting}
              onClick={handleDivineSubmit}
            >
              {isSubmitting ? (
                <>⏳ THẦY ĐANG BẤM QUẺ VÀ THỈNH Ý GEMINI...</>
              ) : (
                <>✨ THẦY BÓI BẤM QUẺ & ĐỌC LỜI PHÁN (GEMINI AI) ✨</>
              )}
            </button>
          </div>
        )}

        {/* 11. Gợi ý tương tác bấm màn hình */}
        <div className="xinchu-click-hint" onClick={handleOpenForm}>
          <span className="hint-sparkle">✨</span>
          <span className="hint-icon">🔮</span>
          <span className="hint-text">CHẠM ĐỂ NHẬP VIỆC & NHỜ THẦY BÓI CHO CHỮ</span>
          <span className="hint-icon">📜</span>
          <span className="hint-sparkle">✨</span>
        </div>
      </div>
    </div>
  );
}
