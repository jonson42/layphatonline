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
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false
  });

  // Kiểm tra trước xem tài khoản có đang bật Live hay không
  try {
    const isLive = await conn.fetchIsLive().catch(() => null);
    if (isLive === false) {
      emit({
        type: 'error',
        message: `Tài khoản @${cleanUser} hiện KHÔNG PHÁT TRỰC TIẾP (Offline) trên TikTok. Vui lòng kiểm tra tài khoản đang phát Live trước khi kết nối, hoặc bật chế độ Giả lập (Auto-Sim) để trải nghiệm thử.`
      });
      return;
    }
  } catch (_) {}

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

  conn.on(ControlEvent.ERROR, (err) => {
    let msg = err?.message || (typeof err === 'string' ? err : 'Lỗi kết nối phòng Live');
    if (msg.includes('illegal secret key') || msg.includes('RoomId not found') || msg.includes('status code 417')) {
      msg = `Tài khoản @${cleanUser} hiện không phát Live hoặc TikTok yêu cầu phiên Live đang hoạt động.`;
    }
    emit({ type: 'error', message: msg });
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

  const onSocial = (data) => {
    const u = extractUser(data);
    emit({ type: 'social', ...u });
  };
  conn.on(WebcastEvent.FOLLOW, onSocial);
  conn.on(WebcastEvent.SHARE, onSocial);
  conn.on(WebcastEvent.SOCIAL, (data) => {
    const action = String(data?.action || '');
    const disp = String(data?.common?.displayText?.displayType || data?.displayType || '').toLowerCase();
    if (action === '1' || action === '3' || disp.includes('follow') || disp.includes('share')) {
      onSocial(data);
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
    let msg = err?.message || 'Không thể kết nối phòng Live';
    if (msg.includes('illegal secret key') || msg.includes('RoomId not found') || msg.includes('status code 417')) {
      msg = `Tài khoản @${cleanUser} hiện không phát Live hoặc TikTok yêu cầu phiên Live đang hoạt động.`;
    }
    emit({ type: 'error', message: msg });
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
