#!/usr/bin/env node
/**
 * TikTok Live Connector Stdio Bridge for C# Temple Backend
 */
let TikTokLiveConnection = null;
let WebcastEvent = null;
let ControlEvent = null;

async function loadLibrary() {
  if (!TikTokLiveConnection) {
    const mod = await import('tiktok-live-connector');
    TikTokLiveConnection = mod.TikTokLiveConnection;
    WebcastEvent = mod.WebcastEvent;
    ControlEvent = mod.ControlEvent;
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

let conn = null;
let isManuallyStopped = false;
let reconnectTimer = null;
const giftComboTracker = new Map();
const recentMembers = new Map();

function extractUser(data) {
  const u = data?.user || data || {};
  const uniqueId = u.uniqueId || u.displayId || data?.uniqueId || '';
  const user = u.nickname || uniqueId || data?.nickname || 'Thí Chủ';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { user, uniqueId, avatar };
}

async function resolveUsername(rawInput) {
  let input = String(rawInput || '').trim();
  if (!input) throw new Error('Username trống');
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('tiktok.com/')) {
    const url = input.startsWith('http') ? input : `https://${input}`;
    const directMatch = url.match(/tiktok\.com\/@([^/?#]+)/i);
    if (directMatch && directMatch[1]) return directMatch[1];
    try {
      const resp = await fetch(url, { redirect: 'follow' });
      const finalUrl = resp.url || '';
      const m = finalUrl.match(/tiktok\.com\/@([^/?#]+)/i);
      if (m && m[1]) return m[1];
    } catch (_) {}
  }
  return input.replace(/^@/, '').split(/[/?#]/)[0].trim();
}

async function connect(rawUser) {
  try {
    await loadLibrary();
  } catch (err) {
    emit({ type: 'error', message: 'Lỗi tải thư viện tiktok-live-connector: ' + (err?.stack || err?.message || err) });
    return;
  }

  if (conn) {
    try { await conn.disconnect(); } catch (_) {}
    conn = null;
  }

  let cleanUser;
  try {
    cleanUser = await resolveUsername(rawUser);
  } catch (e) {
    emit({ type: 'error', message: 'Vui lòng nhập @username hoặc link TikTok Live hợp lệ' });
    return;
  }

  emit({ type: 'connecting', username: cleanUser });

  conn = new TikTokLiveConnection(cleanUser, {
    processInitialData: true,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: false
  });

  conn.on(ControlEvent.CONNECTED, (state) => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    emit({ type: 'connected', roomId: state?.roomId || conn?.roomId || null, username: cleanUser });
  });

  conn.on(ControlEvent.DISCONNECTED, () => {
    emit({ type: 'disconnected', username: cleanUser });
    if (!isManuallyStopped && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!isManuallyStopped) {
          emit({ type: 'connecting', username: cleanUser });
          connect(cleanUser);
        }
      }, 4000);
    }
  });

  let lastEmittedError = '';
  const emitError = (rawErr) => {
    let msg = rawErr?.exception?.message || rawErr?.message || (typeof rawErr === 'string' ? rawErr : '') || 'Không thể kết nối phòng Live';
    if (
      msg.includes('illegal secret key') ||
      msg.includes('RoomId not found') ||
      msg.includes('status code 417') ||
      msg.includes("isn't online") ||
      msg.includes('offline') ||
      msg.includes('not online')
    ) {
      msg = `Tài khoản @${cleanUser} hiện KHÔNG PHÁT TRỰC TIẾP (Offline) trên TikTok. Vui lòng đảm bảo tài khoản đang mở Live trên TikTok trước khi bấm Kết nối, hoặc bật 'Tự động giả lập đông người' để trải nghiệm thử.`;
    }
    if (msg !== lastEmittedError) {
      lastEmittedError = msg;
      emit({ type: 'error', message: msg });
    }
  };

  conn.on(ControlEvent.ERROR, (err) => {
    emitError(err);
  });

  conn.on(WebcastEvent.ROOM_USER, (data) => {
    const viewerCount = Number(data?.total ?? data?.viewerCount ?? 0);
    if (viewerCount > 0) {
      emit({ type: 'room_user', viewerCount });
    }
  });

  const onMember = (data) => {
    const u = extractUser(data);
    if (!u.user || u.user === 'Thí Chủ') {
      u.user = data?.uniqueId || data?.nickname || data?.displayId || data?.user?.uniqueId || 'Thí Chủ Hữu Duyên';
    }
    const key = (u.uniqueId || u.user || '').toLowerCase().trim();
    const now = Date.now();
    if (key) {
      const last = recentMembers.get(key);
      if (last && (now - last < 30000)) {
        return; // Bỏ qua nếu đã phát event vào phòng cho người này trong 30s qua
      }
      recentMembers.set(key, now);
      if (recentMembers.size > 500) {
        for (const [k, ts] of recentMembers) {
          if (now - ts > 60000) recentMembers.delete(k);
        }
      }
    }
    emit({ type: 'member', ...u });
  };
  conn.on(WebcastEvent.MEMBER, onMember);

  conn.on(WebcastEvent.CHAT, (data) => {
    const u = extractUser(data);
    const comment = data?.content || data?.comment || '';
    emit({ type: 'chat', ...u, comment });
  });

  conn.on(WebcastEvent.LIKE, (data) => {
    const u = extractUser(data);
    const count = Math.min(15, Math.max(1, Number(data?.count ?? data?.likeCount ?? 1)));
    emit({ type: 'like', ...u, count });
  });

  conn.on(WebcastEvent.FOLLOW, (data) => {
    const u = extractUser(data);
    emit({ type: 'follow', ...u });
  });

  conn.on(WebcastEvent.SHARE, (data) => {
    const u = extractUser(data);
    emit({ type: 'share', ...u });
  });

  conn.on(WebcastEvent.SOCIAL, (data) => {
    const u = extractUser(data);
    const action = String(data?.action || '');
    const disp = String(data?.common?.displayText?.displayType || data?.displayType || '').toLowerCase();
    if (action === '3' || disp.includes('follow')) {
      emit({ type: 'follow', ...u });
    } else if (action === '1' || disp.includes('share')) {
      emit({ type: 'share', ...u });
    } else {
      emit({ type: 'social', ...u });
    }
  });

  conn.on(WebcastEvent.GIFT, (data) => {
    const u = extractUser(data);
    const giftObj = data?.gift || data?.giftDetails || {};
    const giftId = String(data?.giftId || giftObj?.id || 'rose');
    const groupId = String(data?.groupId || `${u.uniqueId}_${giftId}`);
    const repeatCount = Math.max(1, Number(data?.repeatCount || data?.comboCount || 1));

    const prevCount = giftComboTracker.get(groupId) || 0;
    if (repeatCount <= prevCount && data?.repeatEnd) {
      giftComboTracker.delete(groupId);
      return;
    }
    const deltaCount = Math.max(1, repeatCount - prevCount);
    giftComboTracker.set(groupId, repeatCount);
    if (giftComboTracker.size > 500) {
      const firstKey = giftComboTracker.keys().next().value;
      giftComboTracker.delete(firstKey);
    }

    const diamondCount = Math.max(1, Number(giftObj?.diamondCount || data?.diamondCount || 1));
    const totalCoins = diamondCount * deltaCount;
    const rawGiftName = giftObj?.name || data?.giftName || giftObj?.describe || 'Hoa Hồng Tâm Thành';
    const displayGiftName = deltaCount > 1 ? `${deltaCount}x ${rawGiftName}` : rawGiftName;

    emit({
      type: 'gift',
      ...u,
      coins: totalCoins,
      giftName: displayGiftName,
      deltaCount
    });
  });

  try {
    const roomState = await conn.connect();
    // ControlEvent.CONNECTED already emits connected event, no duplicate emit here
  } catch (err) {
    emitError(err);
  }
}

const targetUser = process.argv[2];
if (targetUser) {
  connect(targetUser);
}

// Support stdin commands: connect <username>, disconnect
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const cmd = JSON.parse(trimmed);
      if (cmd.action === 'connect') {
        isManuallyStopped = false;
        connect(cmd.username);
      } else if (cmd.action === 'disconnect') {
        isManuallyStopped = true;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (conn) { conn.disconnect().catch(() => {}); conn = null; }
        emit({ type: 'disconnected' });
      }
    } catch (_) {}
  }
});
