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
    name: 'Diệu Thảo',
    avatar: '',
    model: 'girl_blue',
    x: 310,
    y: 1420,
    scale: 0.76,
    zIndex: 38,
    dir: 1,
    chat: 'Nhờ thầy đoán trọn quẻ giúp em! 🔮',
    metricText: '📜 XIN CHỮ'
  },
  {
    id: 'br_2',
    name: 'Minh Quân',
    avatar: '',
    model: 'man_orange',
    x: 750,
    y: 1420,
    scale: 0.76,
    zIndex: 38,
    dir: -1,
    chat: 'Thầy giải quẻ rất có tâm! 🙏',
    metricText: '🔮 XEM QUẺ'
  }
];

// Tuyến đường đi bộ di chuyển qua lại liên tục 3D (Đa tầng: Tiền cảnh, Trung cảnh, Dốc xa)
const DEPTH_ROUTES = [
  { route: 'route-traverse-left-to-right', duration: 11.5, dir: 1 },
  { route: 'route-traverse-right-to-left', duration: 12.0, dir: -1 },
  { route: 'route-traverse-mid-l2r', duration: 13.5, dir: 1 },
  { route: 'route-traverse-mid-r2l', duration: 14.0, dir: -1 },
  { route: 'route-traverse-back-l2r', duration: 15.0, dir: 1 },
  { route: 'route-traverse-back-r2l', duration: 15.5, dir: -1 },
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
    model: 'boy_green',
    route: 'route-traverse-left-to-right',
    duration: 11.0,
    delay: 0,
    dir: 1,
    chat: 'Thầy bói đoán quẻ chuẩn lắm nè! 🔮',
    metricText: 'DẠO PHỐ'
  },
  {
    id: 'dw_2',
    name: 'Ngọc Anh Nguyễn',
    avatar: '',
    model: 'girl_pink',
    route: 'route-traverse-right-to-left',
    duration: 11.5,
    delay: 1.2,
    dir: -1,
    chat: 'Hội xuân năm nay đông vui quá! ✨',
    metricText: 'DU XUÂN'
  },
  {
    id: 'dw_3',
    name: 'Bác Ba Bói Quẻ',
    avatar: '',
    model: 'man_yellow',
    route: 'route-traverse-mid-l2r',
    duration: 13.0,
    delay: 2.4,
    dir: 1,
    chat: 'Bói quẻ khai xuân đầu năm! 🧧',
    metricText: 'XEM TƯỚNG'
  },
  {
    id: 'dw_4',
    name: 'Chị Tư Đi Hội',
    avatar: '',
    model: 'girl_blue',
    route: 'route-traverse-mid-r2l',
    duration: 13.5,
    delay: 3.6,
    dir: -1,
    chat: 'Nhờ thầy cho chữ cầu tài lộc! 💰',
    metricText: 'XIN CHỮ'
  },
  {
    id: 'dw_5',
    name: 'Bé Mai Cầu May',
    avatar: '',
    model: 'girl_purple',
    route: 'route-traverse-back-l2r',
    duration: 14.5,
    delay: 4.8,
    dir: 1,
    chat: 'Chúc thầy bói vạn sự hanh thông! 🌸',
    metricText: 'CẦU MAY'
  },
  {
    id: 'dw_6',
    name: 'Anh Bảy Xem Tướng',
    avatar: '',
    model: 'boy_green',
    route: 'route-traverse-back-r2l',
    duration: 15.0,
    delay: 6.0,
    dir: -1,
    chat: 'Đông vui tấp nập quá bà con ơi! 🏮',
    metricText: 'DẠO PHỐ'
  },
  {
    id: 'dw_7',
    name: 'Hoàng Long',
    avatar: '',
    model: 'man_orange',
    route: 'route-depth-out-left',
    duration: 11.0,
    delay: 7.2,
    dir: -1,
    chat: 'Thầy bói phán kinh doanh rất linh! 🔮',
    metricText: 'XEM QUẺ'
  },
  {
    id: 'dw_8',
    name: 'Thu Trang',
    avatar: '',
    model: 'girl_pink',
    route: 'route-depth-in-right',
    duration: 12.0,
    delay: 8.4,
    dir: -1,
    chat: 'Cầu chúc vạn sự cát tường bình an! ✨',
    metricText: 'CẦU AN'
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
    visible: false,
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

  // Luân chuyển người đi bộ chiều sâu & qua lại liên tục 3D
  const handleWalkerEnd = useCallback((walker) => {
    setDepthWalkers((prev) => {
      return prev.map((w) => {
        if (w.id !== walker.id) return w;
        const routeObj = DEPTH_ROUTES[Math.floor(Math.random() * DEPTH_ROUTES.length)];
        const newModel = ALL_MODELS[Math.floor(Math.random() * ALL_MODELS.length)];
        const newName = AMBIENT_NAMES[Math.floor(Math.random() * AMBIENT_NAMES.length)];
        const newChat = Math.random() < 0.55 ? AMBIENT_CHATS[Math.floor(Math.random() * AMBIENT_CHATS.length)] : null;
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

    const isGreetEvent = (typeof activeEvent.type === 'string' && activeEvent.type.endsWith('Greet')) || activeEvent.type === 'burnIncense';

    // Enqueue TTS phát đọc trên phiên live (ngoại trừ greet event xử lý riêng theo ngữ cảnh Thầy Bói)
    if (!isGreetEvent && activeEvent.ttsText && audio) {
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
    } else if (isGreetEvent) {
      const greetText = `Thầy Bói kính chào ${user} đã ghé gian hàng xem bói & xin chữ! Chúc thí chủ vạn sự an khang! 🔮🌸`;
      setSpeech({
        user,
        avatar,
        text: greetText,
        isHighlight: false
      });
      triggerViewerInteraction(user, avatar, '🌸 Ghé Thăm', 'greet', 0);

      // Kích hoạt âm thanh TTS giọng đọc chào mừng thí chủ
      if (audio) {
        const speechTts = (activeEvent.ttsText && (activeEvent.ttsText.includes('Thầy') || activeEvent.ttsText.includes('xin chữ') || activeEvent.ttsText.includes('bói')))
          ? activeEvent.ttsText
          : `Thầy Bói kính chào ${user} đã ghé gian hàng xem bói và xin chữ! Nhờ thí chủ cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn nghênh tài lộc ạ!`;
        audio.enqueueTts(speechTts, {
          voice: activeEvent.ttsVoice || 'maichi'
        });
      }

      setTimeout(() => {
        setSpeech((prev) => ({
          ...prev,
          text: 'Nhờ anh/chị vừa vào live cho em xin vài đồng, thả tim hoặc follow để thầy đoán trọn quẻ, viết chữ giải hạn ạ! 🔮🌸🙏',
          isHighlight: false
        }));
      }, 8500);
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

        {/* 3. Đám đông khách dạo phố & xin chữ (Đi qua lại liên tục 3D) */}
        <div className="bothi-crowd-layer">
          {/* A. Hai người ngồi/đứng nghe Thầy Bói đoán quẻ bên chõng tre */}
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
                    <span>🔮</span><strong>{b.metricText || 'XEM QUẺ'}</strong>
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

          {/* B. Người đi bộ "DI CHUYỂN QUA LẠI LIÊN TỤC" (Trái qua phải, Phải qua trái, Chiều sâu 3D) */}
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
                    <span>🌸</span><strong>{w.metricText || 'DU XUÂN'}</strong>
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

          {/* Người xem vừa vào live / xin chữ sải bước lại gần bàn Thầy Bói trên mặt đất */}
          {activeViewerWalker && (
            <div
              className={`xinchu-viewer-walker ${activeViewerWalker.dir === -1 ? 'from-right' : 'from-left'}`}
              style={{
                zIndex: 42
              }}
            >
              <div className="xinchu-viewer-content">
                {activeViewerWalker.chatBubble && (
                  <div className="walker-chat-bubble">
                    <span>{activeViewerWalker.chatBubble}</span>
                    <div className="chat-bubble-tail" />
                  </div>
                )}
                <div className="walker-capsule-badge">
                  <div className="capsule-avatar-ring">
                    {activeViewerWalker.avatar ? (
                      <img src={activeViewerWalker.avatar} alt="avatar" className="capsule-avatar-img" />
                    ) : (
                      <div className="capsule-avatar-fallback" style={{ background: activeViewerWalker.avatarBg || getAvatarColor(activeViewerWalker.name) }}>
                        {activeViewerWalker.name ? activeViewerWalker.name.slice(0, 1).toUpperCase() : '✨'}
                      </div>
                    )}
                    <span className="capsule-live-dot" />
                  </div>
                  <span className="capsule-username">@{activeViewerWalker.name}</span>
                  <div className="capsule-metric-pill pill-ambient" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)', color: '#ffe694', borderColor: '#f59e0b' }}>
                    <span>🔮</span><strong>{activeViewerWalker.actionText || 'XIN QUẺ'}</strong>
                  </div>
                </div>
                <div className="walker-bob-box" style={{ transform: activeViewerWalker.dir === -1 ? 'scaleX(-1)' : 'scaleX(1)' }}>
                  <img
                    src={getSpriteImage(activeViewerWalker.model)}
                    alt={activeViewerWalker.name}
                    className="xinchu-visitor-sprite"
                    onError={(e) => {
                      e.currentTarget.src = manYellowImg;
                    }}
                  />
                </div>
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
        {activeScroll.visible ? (
          <div className="xinchu-scroll-container" key={`${activeScroll.user}_${activeScroll.word}_${activeScroll.intent}`}>
            <button
              className="scroll-close-btn"
              title="Thu gọn liễn để ngắm cảnh"
              onClick={(e) => {
                e.stopPropagation();
                setActiveScroll((prev) => ({ ...prev, visible: false }));
              }}
            >
              ✕
            </button>
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
        ) : (
          <div
            className="xinchu-open-scroll-pill"
            onClick={() => setActiveScroll((prev) => ({ ...prev, visible: true }))}
            title="Bấm để xem lại cuộn liễn quẻ Thầy Bói"
          >
            <span>📜</span>
            <span>XEM QUẺ THẦY BÓI</span>
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
