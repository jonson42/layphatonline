#!/usr/bin/env node
/**
 * TikTok Live Playwright Commenter Bridge
 * Tự động gửi bình luận và lời chúc vào khung chat TikTok Live
 */
const path = require('path');
const fs = require('fs');

let playwrightChromium = null;
try {
  const pw = require('playwright');
  playwrightChromium = pw.chromium;
} catch (e) {
  try {
    const pw = require(path.join(__dirname, 'node_modules', 'playwright'));
    playwrightChromium = pw.chromium;
  } catch (err) {
    emit({ type: 'error', message: 'Không tìm thấy thư viện Playwright: ' + err.message });
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

let context = null;
let activePage = null;
let currentLiveUrl = '';
let isClosing = false;
let lastKnownLoggedIn = false;
let currentIsHeadless = false;

// Đường dẫn profile lưu session đăng nhập vĩnh viễn
const profileDir = path.resolve(__dirname, '..', 'data', 'tiktok_browser_profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}
const savedCookiesFile = path.join(profileDir, 'saved_cookies.json');

/**
 * Phân tích chuỗi Cookie từ người dùng (hỗ trợ cả mã sessionid thô lẫn chuỗi cookie header)
 */
function parseCookieInput(cookieStr) {
  if (!cookieStr || typeof cookieStr !== 'string') return [];
  const trimmed = cookieStr.trim();
  if (!trimmed) return [];

  const cookies = [];
  // TH 1: Chỉ là 1 mã sessionid thô (chuỗi hex/token không chứa dấu = hay ;)
  if (!trimmed.includes('=') && !trimmed.includes(';') && trimmed.length >= 16) {
    cookies.push(
      { name: 'sessionid', value: trimmed, domain: '.tiktok.com', path: '/' },
      { name: 'sessionid_ss', value: trimmed, domain: '.tiktok.com', path: '/' },
      { name: 'sid_tt', value: trimmed, domain: '.tiktok.com', path: '/' }
    );
    return cookies;
  }

  // TH 2: Chuỗi cookie header "sessionid=xyz; tt-target-idc=useast2a; ..."
  const parts = trimmed.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const name = part.slice(0, eqIdx).trim();
      const value = part.slice(eqIdx + 1).trim();
      if (name && value) {
        cookies.push({
          name,
          value,
          domain: '.tiktok.com',
          path: '/'
        });
      }
    }
  }
  return cookies;
}

/**
 * Kiểm tra nhanh file Cookies SQLite trên đĩa hoặc saved_cookies.json
 */
function checkSavedCookies() {
  try {
    if (fs.existsSync(savedCookiesFile)) {
      const raw = fs.readFileSync(savedCookiesFile, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.some(ck => ck.name === 'sessionid' || ck.name === 'sessionid_ss' || ck.name === 'sid_tt')) {
        return true;
      }
    }
  } catch (_) {}

  try {
    const cookiesPath = path.join(profileDir, 'Default', 'Network', 'Cookies');
    if (fs.existsSync(cookiesPath)) {
      const buf = fs.readFileSync(cookiesPath);
      const content = buf.toString('latin1');
      return content.includes('sessionid') && content.includes('.tiktok.com');
    }
  } catch (_) {}

  return false;
}

/**
 * Nạp cookies đã lưu từ saved_cookies.json vào Context
 */
async function loadSavedCookies(ctx) {
  try {
    if (fs.existsSync(savedCookiesFile) && ctx) {
      const raw = fs.readFileSync(savedCookiesFile, 'utf8');
      const cookies = JSON.parse(raw);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await ctx.addCookies(cookies);
        lastKnownLoggedIn = true;
        return true;
      }
    }
  } catch (_) {}
  return false;
}

/**
 * Dọn dẹp lockfile cũ nếu trình duyệt trước đó bị crash
 */
function cleanupStaleLockfile() {
  try {
    const lock = path.join(profileDir, 'lockfile');
    if (fs.existsSync(lock)) {
      try {
        const fd = fs.openSync(lock, 'r+');
        fs.closeSync(fd);
        fs.unlinkSync(lock);
      } catch (_) {}
    }
  } catch (_) {}
}

async function getBrowserContext(headless = false) {
  // Nếu đã có context nhưng người dùng muốn mở GUI đăng nhập mà context cũ đang là headless, đóng để mở lại GUI
  if (context) {
    if (!headless && currentIsHeadless) {
      try {
        await context.close();
      } catch (_) {}
      context = null;
      activePage = null;
    } else {
      return context;
    }
  }

  if (!playwrightChromium) throw new Error('Playwright Chromium chưa sẵn sàng');

  cleanupStaleLockfile();

  currentIsHeadless = !!headless;
  const launchOptions = {
    headless: !!headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      '--window-size=1280,820'
    ],
    viewport: null
  };

  // Thử dùng Chrome thực của hệ thống, nếu không có thì fallback sang Chromium / Edge
  try {
    context = await playwrightChromium.launchPersistentContext(profileDir, {
      ...launchOptions,
      channel: 'chrome'
    });
  } catch (errChrome) {
    cleanupStaleLockfile();
    try {
      context = await playwrightChromium.launchPersistentContext(profileDir, {
        ...launchOptions,
        channel: 'msedge'
      });
    } catch (errEdge) {
      cleanupStaleLockfile();
      context = await playwrightChromium.launchPersistentContext(profileDir, launchOptions);
    }
  }

  // Tự động nạp cookies đã lưu
  await loadSavedCookies(context);

  context.on('close', () => {
    context = null;
    activePage = null;
    if (!isClosing) {
      emit({ type: 'status', running: false, loggedIn: lastKnownLoggedIn, message: 'Trình duyệt đã đóng' });
    }
  });

  return context;
}

/**
 * Kiểm tra trạng thái đăng nhập TikTok qua cả Cookies trong Context lẫn DOM trang
 */
async function checkLoggedIn(page, ctx) {
  // 1. Kiểm tra qua Context Cookies trong bộ nhớ
  try {
    const c = ctx || context || (page ? page.context() : null);
    if (c) {
      const cookies = await c.cookies('https://www.tiktok.com');
      const hasSession = cookies.some(ck => 
        (ck.name === 'sessionid' || ck.name === 'sessionid_ss' || ck.name === 'sid_tt' || ck.name === 'passport_auth_status') && ck.value
      );
      if (hasSession) {
        lastKnownLoggedIn = true;
        return true;
      }
    }
  } catch (_) {}

  // 2. Kiểm tra qua file cookie database hoặc saved_cookies.json
  if (checkSavedCookies()) {
    lastKnownLoggedIn = true;
    return true;
  }

  // 3. Fallback kiểm tra DOM trên trang nếu đang mở
  if (page && !page.isClosed()) {
    try {
      const domResult = await page.evaluate(() => {
        const loginBtn = document.querySelector('[data-e2e="top-login-button"], [id*="login-button"], [data-e2e="login-to-chat"]');
        if (loginBtn) return false;
        const avatarOrInput = document.querySelector('img[class*="Avatar"], [data-e2e="profile-icon"], img[src*="avatar"], div[data-e2e="comment-input"], div[contenteditable="true"]');
        return !!avatarOrInput;
      });
      if (domResult) {
        lastKnownLoggedIn = true;
        return true;
      }
    } catch (_) {}
  }

  return lastKnownLoggedIn;
}

async function setCookies(cookieInput) {
  try {
    const list = parseCookieInput(cookieInput);
    if (!list || list.length === 0) {
      emit({ type: 'error', message: 'Không tìm thấy cookie hợp lệ từ nội dung vừa nhập. Hãy kiểm tra lại (cần có sessionid hoặc chuỗi cookie đầy đủ).' });
      return;
    }

    // Lưu vào saved_cookies.json để nạp lại vĩnh viễn
    try {
      fs.writeFileSync(savedCookiesFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (eWrite) {
      console.error('Không thể lưu saved_cookies.json:', eWrite.message);
    }

    lastKnownLoggedIn = true;

    // Nạp vào context hiện tại nếu đang mở
    const ctx = await getBrowserContext(false);
    await ctx.addCookies(list);

    // Nếu activePage đang mở, tải lại trang
    if (activePage && !activePage.isClosed()) {
      try {
        const cur = activePage.url();
        if (cur && cur.includes('tiktok.com')) {
          await activePage.reload({ timeout: 20000, waitUntil: 'domcontentloaded' });
        }
      } catch (_) {}
    }

    emit({
      type: 'status',
      running: true,
      loggedIn: true,
      message: `✅ Đã lưu và kích hoạt ${list.length} Cookie TikTok! Trạng thái: ĐÃ ĐĂNG NHẬP.`
    });
  } catch (err) {
    emit({ type: 'error', message: `Lỗi khi lưu cookie: ${err.message}` });
  }
}

async function openLive(url, headless = false) {
  try {
    isClosing = false;
    currentLiveUrl = url;
    emit({ type: 'status', running: true, loggedIn: lastKnownLoggedIn, message: `Đang mở trình duyệt kết nối ${url}...` });

    const ctx = await getBrowserContext(headless);
    const pages = ctx.pages();
    activePage = pages.length > 0 ? pages[0] : await ctx.newPage();

    await activePage.goto(url, { timeout: 35000, waitUntil: 'domcontentloaded' });
    await activePage.waitForTimeout(2500);

    const loggedIn = await checkLoggedIn(activePage, ctx);
    emit({
      type: 'status',
      running: true,
      loggedIn,
      url: activePage.url(),
      title: await activePage.title(),
      message: loggedIn
        ? 'Đã kết nối phòng Live và sẵn sàng bình luận'
        : 'Đã mở phòng Live (Lưu ý: Chưa đăng nhập tài khoản TikTok để gửi chat)'
    });
  } catch (err) {
    emit({ type: 'error', message: `Không thể mở phòng Live: ${err.message}` });
  }
}

async function openLogin() {
  try {
    isClosing = false;
    emit({ type: 'status', running: true, loggedIn: lastKnownLoggedIn, message: 'Đang mở cửa sổ đăng nhập TikTok...' });
    
    // Mở headful GUI để người dùng thấy rõ cửa sổ trên màn hình
    const ctx = await getBrowserContext(false);
    const pages = ctx.pages();
    activePage = pages.length > 0 ? pages[0] : await ctx.newPage();

    await activePage.goto('https://www.tiktok.com/login', { timeout: 35000, waitUntil: 'domcontentloaded' });
    try {
      await activePage.bringToFront();
    } catch (_) {}

    emit({
      type: 'status',
      running: true,
      loggedIn: lastKnownLoggedIn,
      message: 'Vui lòng quét mã QR hoặc đăng nhập tài khoản TikTok trên cửa sổ trình duyệt vừa mở.'
    });

    // Lắng nghe tự động phát hiện khi người dùng đăng nhập thành công
    const pollTimer = setInterval(async () => {
      if (!context || isClosing) {
        clearInterval(pollTimer);
        return;
      }
      const ok = await checkLoggedIn(activePage, ctx);
      if (ok) {
        clearInterval(pollTimer);

        // Lưu cookie vào saved_cookies.json để lần sau không cần đăng nhập lại
        try {
          const cks = await ctx.cookies('https://www.tiktok.com');
          if (cks && cks.length > 0) {
            fs.writeFileSync(savedCookiesFile, JSON.stringify(cks, null, 2), 'utf8');
          }
        } catch (_) {}

        const targetLive = currentLiveUrl || 'https://www.tiktok.com/@tranyennhi0987/live';
        emit({
          type: 'status',
          running: true,
          loggedIn: true,
          message: `✅ Đã đăng nhập TikTok thành công! Đang tự động chuyển vào phòng Live: ${targetLive}...`
        });

        // Tự động chuyển thẳng từ trang Login sang phòng Live
        try {
          await activePage.goto(targetLive, { timeout: 35000, waitUntil: 'domcontentloaded' });
          await activePage.waitForTimeout(2000);
          emit({
            type: 'status',
            running: true,
            loggedIn: true,
            url: activePage.url(),
            title: await activePage.title(),
            message: '✅ Đã kết nối phòng Live và sẵn sàng bình luận'
          });
        } catch (_) {}
      }
    }, 2500);
  } catch (err) {
    emit({ type: 'error', message: `Lỗi mở trang đăng nhập: ${err.message}` });
  }
}

async function sendComment(text) {
  if (!text || !text.trim()) {
    emit({ type: 'comment_result', success: false, error: 'Nội dung bình luận trống' });
    return;
  }

  if (!activePage || activePage.isClosed()) {
    emit({ type: 'comment_result', success: false, error: 'Chưa mở phòng Live trên Playwright' });
    return;
  }

  // Tự động chuyển hướng sang phòng Live nếu trình duyệt vẫn đang ở trang đăng nhập
  const curUrl = activePage.url() || '';
  if (curUrl.includes('/login') || (!curUrl.includes('/live') && !curUrl.includes('@'))) {
    const targetLive = currentLiveUrl || 'https://www.tiktok.com/@tranyennhi0987/live';
    emit({
      type: 'status',
      running: true,
      loggedIn: true,
      url: targetLive,
      message: `Đang tự động chuyển từ trang đăng nhập sang phòng Live: ${targetLive}...`
    });
    try {
      await activePage.goto(targetLive, { timeout: 35000, waitUntil: 'domcontentloaded' });
      await activePage.waitForTimeout(2500);
    } catch (errNav) {
      emit({ type: 'comment_result', success: false, error: `Không thể chuyển sang phòng Live: ${errNav.message}` });
      return;
    }
  }

  const commentText = text.trim();
  try {
    // 1. Tự động dọn dẹp các popup cản trở trước khi tìm ô chat
    try {
      const cookieBtn = await activePage.$('button[id*="cookie" i], button[class*="cookie" i], [data-e2e="cookie-banner"] button');
      if (cookieBtn && await cookieBtn.isVisible()) {
        await cookieBtn.click();
        await activePage.waitForTimeout(300);
      }
      const closeBtn = await activePage.$('[data-e2e="modal-close-inner-button"], [aria-label="Close"], button.btn-close, [data-e2e="close-icon"]');
      if (closeBtn && await closeBtn.isVisible()) {
        await closeBtn.click();
        await activePage.waitForTimeout(300);
      }
      const expandChatBtn = await activePage.$('[data-e2e="expand-chat-button"], button[aria-label*="chat" i], [class*="ChatRoomFold"]');
      if (expandChatBtn && await expandChatBtn.isVisible()) {
        await expandChatBtn.click();
        await activePage.waitForTimeout(400);
      }
    } catch (_) {}

    // 2. Tìm phần tử nhập bình luận trong khung chat TikTok Live
    const candidateSelectors = [
      'input[placeholder*="Type" i]',
      'textarea[placeholder*="Type" i]',
      '[placeholder*="Type" i]',
      '[placeholder*="Type..."]',
      'div[data-e2e="comment-input"]',
      'div[data-e2e="chat-room-input"]',
      'div[data-e2e="live-comment-input"]',
      'div[contenteditable="true"]',
      'div[role="textbox"]',
      '[data-e2e*="chat"] input',
      '[data-e2e*="chat"] textarea',
      '[class*="Chat"] input',
      '[class*="Chat"] textarea',
      '[class*="chat"] input',
      '[class*="chat"] textarea',
      '[class*="Chat"] [contenteditable="true"]',
      '[class*="chat"] [contenteditable="true"]',
      'textarea[placeholder*="bình luận" i]',
      'textarea[placeholder*="comment" i]',
      'textarea[placeholder*="chat" i]',
      'input[placeholder*="bình luận" i]',
      'input[placeholder*="comment" i]',
      'input[placeholder*="chat" i]',
      'div[class*="ChatInputContainer"] [contenteditable="true"]',
      'div[class*="DivChatRoom"] [contenteditable="true"]',
      'div[class*="CommentInput"] [contenteditable="true"]',
      'div[class*="DivBottomArea"] [contenteditable="true"]',
      'div[class*="ChatRoom"] [contenteditable="true"]',
      'div[class*="LiveChat"] [contenteditable="true"]',
      'div[class*="Editor"] [contenteditable="true"]',
      'div.DraftEditor-root [contenteditable="true"]',
      'div[class*="editor"] [contenteditable="true"]',
      'div[class*="chat-input"]',
      '[data-e2e="chat-input-area"]',
      '[placeholder*="Gửi bình luận" i]',
      '[placeholder*="Nhập bình luận" i]',
      '[placeholder*="Add comment" i]',
      '[placeholder*="Send a comment" i]',
      '[placeholder*="Say something" i]',
      '[placeholder*="Type a message" i]',
      '[placeholder*="Chat..." i]'
    ];

    let inputElement = null;
    const startTime = Date.now();
    while (!inputElement && (Date.now() - startTime < 5000)) {
      for (const sel of candidateSelectors) {
        try {
          const el = await activePage.$(sel);
          if (el && await el.isVisible()) {
            inputElement = el;
            break;
          }
        } catch (_) {}
      }
      if (!inputElement) {
        await activePage.waitForTimeout(500);
      }
    }

    // Fallback thông minh: Quét trực tiếp DOM tìm phần tử chat theo placeholder hoặc tọa độ
    if (!inputElement) {
      try {
        const found = await activePage.evaluate(() => {
          const all = Array.from(document.querySelectorAll('input, textarea, div[contenteditable="true"], [role="textbox"]'));
          for (const el of all) {
            const ph = (el.getAttribute('placeholder') || '').toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            if (ph.includes('type') || ph.includes('comment') || ph.includes('bình luận') || ph.includes('chat') || aria.includes('comment') || aria.includes('chat')) {
              el.setAttribute('data-agy-chat', 'true');
              return true;
            }
          }
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 30 && rect.height > 15 && rect.bottom > window.innerHeight * 0.65 && rect.left > window.innerWidth * 0.45) {
              el.setAttribute('data-agy-chat', 'true');
              return true;
            }
          }
          return false;
        });
        if (found) {
          inputElement = await activePage.$('[data-agy-chat="true"]');
        }
      } catch (_) {}
    }

    if (!inputElement) {
      let isEndedOrOffline = false;
      let isLoginRequired = false;
      let isCommentsOff = false;
      try {
        const pageStatus = await activePage.evaluate(() => {
          const txt = (document.body ? document.body.innerText : '');
          return {
            hasEnded: /LIVE has ended|Phát trực tiếp đã kết thúc|Video này không khả dụng|chưa phát trực tiếp|đang ngoại tuyến|offline|chưa bắt đầu/i.test(txt),
            hasLogin: /Log in to chat|Đăng nhập để bình luận|Đăng nhập để chat|Log in to follow/i.test(txt) || !!document.querySelector('[data-e2e="login-to-chat"]'),
            hasCommentsOff: /Bình luận đã bị tắt|Comments are turned off|Comments disabled/i.test(txt)
          };
        });
        isEndedOrOffline = pageStatus.hasEnded;
        isLoginRequired = pageStatus.hasLogin;
        isCommentsOff = pageStatus.hasCommentsOff;

        const debugPath = path.resolve(profileDir, 'debug_comment_error.png');
        await activePage.screenshot({ path: debugPath }).catch(() => {});
      } catch (_) {}

      const loggedIn = await checkLoggedIn(activePage, context);

      let finalError;
      if (isEndedOrOffline) {
        finalError = 'Phòng Live hiện đang NGOẠI TUYẾN (Offline). TikTok chỉ hiển thị ô nhập chat khi tài khoản đang PHÁT TRỰC TIẾP thực tế. Vui lòng bật Live trên TikTok trước khi gửi thử bình luận!';
      } else if (!loggedIn || isLoginRequired) {
        finalError = 'Tài khoản chưa đăng nhập TikTok. Bạn có thể dán mã Cookie/SessionID từ trình duyệt hiện tại hoặc bấm "Mở trình duyệt đăng nhập TikTok"!';
      } else if (isCommentsOff) {
        finalError = 'Chủ phòng Live đã tắt tính năng bình luận trong phiên phát sóng này.';
      } else {
        finalError = 'Không tìm thấy ô nhập chat trên giao diện Live (hãy kiểm tra xem phòng Live có đang mở phát trực tiếp và mở chat không)';
      }

      emit({
        type: 'comment_result',
        success: false,
        error: finalError
      });
      return;
    }

    // 3. Focus và nhập nội dung như người thật (human typing)
    await inputElement.scrollIntoViewIfNeeded();
    await inputElement.click();
    await activePage.waitForTimeout(150);

    // Xóa văn bản cũ nếu có
    await activePage.keyboard.press('Control+A');
    await activePage.keyboard.press('Backspace');
    await activePage.waitForTimeout(100);

    // Chèn văn bản bằng insertText: Playwright gửi trực tiếp chuỗi Unicode qua CDP Input.insertText
    // Tuyệt đối không dùng keyboard.type() vì sẽ sinh ra raw keydown khiến Unikey/EVKey trên Windows can thiệp gây nhân đôi ký tự và lỗi font
    await activePage.keyboard.insertText(commentText);
    await activePage.waitForTimeout(200);

    // Fallback bảo đảm nội dung đã vào input / contenteditable (Draft.js / Lexical / React)
    await activePage.evaluate((text) => {
      const active = document.activeElement;
      if (!active) return;
      const current = (active.innerText || active.value || '').trim();
      if (!current) {
        if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
          active.value = text;
          active.dispatchEvent(new Event('input', { bubbles: true }));
          active.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (active.isContentEditable) {
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, text);
          active.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        }
      }
    }, commentText);
    await activePage.waitForTimeout(150);

    // 4. Tìm nút gửi (post/send button) và nhấn Enter
    try {
      const postBtnSelectors = [
        'button[data-e2e="comment-post"]',
        'button[data-e2e="chat-room-send-btn"]',
        'button[class*="ButtonPost"]',
        'button[class*="SendButton"]',
        'button[type="submit"]',
        'button:has(svg[data-e2e*="send"])',
        '[aria-label*="Send" i]',
        '[aria-label*="Gửi" i]'
      ];
      for (const bSel of postBtnSelectors) {
        const btn = await activePage.$(bSel);
        if (btn && await btn.isVisible()) {
          const isDisabled = await btn.isDisabled();
          if (!isDisabled) {
            await btn.click();
            break;
          }
        }
      }
    } catch (_) {}

    // Luôn luôn nhấn Enter để đảm bảo gửi tin nhắn
    await activePage.keyboard.press('Enter');
    await activePage.waitForTimeout(600);

    emit({
      type: 'comment_result',
      success: true,
      text: commentText,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    emit({
      type: 'comment_result',
      success: false,
      text: commentText,
      error: `Lỗi khi gửi bình luận: ${err.message}`
    });
  }
}

async function closeBrowser() {
  isClosing = true;
  try {
    if (context) {
      await context.close();
      context = null;
      activePage = null;
    }
    emit({ type: 'status', running: false, loggedIn: lastKnownLoggedIn, message: 'Đã đóng trình duyệt Playwright' });
  } catch (err) {
    emit({ type: 'error', message: `Lỗi đóng trình duyệt: ${err.message}` });
  }
}

// Xử lý commands từ C# qua stdin
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const cmd = JSON.parse(trimmed);
      switch (cmd.action) {
        case 'open':
          await openLive(cmd.url || 'https://www.tiktok.com/live', cmd.headless || false);
          break;
        case 'open_login':
          await openLogin();
          break;
        case 'set_cookies':
        case 'import_cookies':
          await setCookies(cmd.cookie || cmd.cookies);
          break;
        case 'comment':
          await sendComment(cmd.text);
          break;
        case 'status':
          emit({
            type: 'status',
            running: !!context && !context.isClosed?.(),
            loggedIn: await checkLoggedIn(activePage, context),
            url: activePage ? activePage.url() : ''
          });
          break;
        case 'close':
        case 'stop':
          await closeBrowser();
          break;
      }
    } catch (e) {
      emit({ type: 'error', message: `Lỗi xử lý lệnh: ${e.message}` });
    }
  }
});

// Báo hiệu script đã khởi động thành công và nạp trạng thái phiên đăng nhập lưu sẵn
(async () => {
  lastKnownLoggedIn = checkSavedCookies();
  emit({
    type: 'ready',
    loggedIn: lastKnownLoggedIn,
    message: lastKnownLoggedIn
      ? 'TikTok Playwright Commenter Bridge đã sẵn sàng (Đã nhận diện đăng nhập)'
      : 'TikTok Playwright Commenter Bridge đã sẵn sàng'
  });
})();
