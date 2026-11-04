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

// Đường dẫn profile lưu session đăng nhập vĩnh viễn
const profileDir = path.resolve(__dirname, '..', 'data', 'tiktok_browser_profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

/**
 * Kiểm tra nhanh file Cookies SQLite trên đĩa để xem đã có sessionid của TikTok chưa
 */
function checkSavedCookies() {
  try {
    const cookiesPath = path.join(profileDir, 'Default', 'Network', 'Cookies');
    if (!fs.existsSync(cookiesPath)) return false;
    const buf = fs.readFileSync(cookiesPath);
    const content = buf.toString('latin1');
    return content.includes('sessionid') && content.includes('.tiktok.com');
  } catch (_) {
    return false;
  }
}

async function getBrowserContext(headless = false) {
  if (context) return context;
  if (!playwrightChromium) throw new Error('Playwright Chromium chưa sẵn sàng');

  const launchOptions = {
    headless: !!headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-size=1280,820'
    ],
    viewport: { width: 1280, height: 760 }
  };

  // Thử dùng Chrome thực của hệ thống, nếu không có thì fallback sang Chromium / Edge
  try {
    context = await playwrightChromium.launchPersistentContext(profileDir, {
      ...launchOptions,
      channel: 'chrome'
    });
  } catch (errChrome) {
    try {
      context = await playwrightChromium.launchPersistentContext(profileDir, {
        ...launchOptions,
        channel: 'msedge'
      });
    } catch (errEdge) {
      context = await playwrightChromium.launchPersistentContext(profileDir, launchOptions);
    }
  }

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

  // 2. Kiểm tra qua file cookie database của profile Chrome
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
    // Mở headful để người dùng thấy và quét mã QR hoặc đăng nhập
    const ctx = await getBrowserContext(false);
    const pages = ctx.pages();
    activePage = pages.length > 0 ? pages[0] : await ctx.newPage();

    await activePage.goto('https://www.tiktok.com/login', { timeout: 35000, waitUntil: 'domcontentloaded' });
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
        emit({
          type: 'status',
          running: true,
          loggedIn: true,
          message: '✅ Đã đăng nhập TikTok thành công! Đã lưu session vĩnh viễn.'
        });
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

  const commentText = text.trim();
  try {
    // 1. Tìm phần tử nhập bình luận trong khung chat TikTok Live
    const candidateSelectors = [
      'div[data-e2e="comment-input"]',
      'div[contenteditable="true"]',
      '[data-e2e="chat-room-input"]',
      '[data-e2e="live-comment-input"]',
      'div[class*="ChatInputContainer"] [contenteditable="true"]',
      'div[class*="DivChatRoom"] [contenteditable="true"]',
      'div[class*="CommentInput"] [contenteditable="true"]',
      'div[class*="DivBottomArea"] [contenteditable="true"]',
      'textarea[placeholder*="bình luận" i]',
      'textarea[placeholder*="comment" i]',
      '[placeholder*="Gửi bình luận" i]',
      '[placeholder*="Add comment" i]',
      '[placeholder*="Send a comment" i]',
      '[placeholder*="Say something" i]'
    ];

    // Chờ ô nhập bình luận xuất hiện (tối đa 5s phòng khi live đang tải chat)
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

    if (!inputElement) {
      // Kiểm tra xem có đang yêu cầu đăng nhập không
      const loggedIn = await checkLoggedIn(activePage, context);
      emit({
        type: 'comment_result',
        success: false,
        error: loggedIn
          ? 'Không tìm thấy ô nhập chat trên giao diện Live (hãy kiểm tra xem phòng Live có đang mở chat không)'
          : 'Tài khoản chưa đăng nhập TikTok. Vui lòng bấm "Mở trình duyệt đăng nhập TikTok" trước!'
      });
      return;
    }

    // 2. Focus và nhập nội dung như người thật (human typing)
    await inputElement.scrollIntoViewIfNeeded();
    await inputElement.click();
    await activePage.waitForTimeout(150);

    // Xóa văn bản cũ nếu có
    await activePage.keyboard.press('Control+A');
    await activePage.keyboard.press('Backspace');
    await activePage.waitForTimeout(100);

    // Gõ phím tự nhiên
    await activePage.keyboard.type(commentText, { delay: 35 });
    await activePage.waitForTimeout(250);

    // 3. Tìm nút gửi (post/send button) hoặc nhấn Enter
    let clickedPost = false;
    try {
      const postBtnSelectors = [
        'button[data-e2e="comment-post"]',
        'button[class*="ButtonPost"]',
        'button[type="submit"]',
        'button:has(svg[data-e2e*="send"])'
      ];
      for (const bSel of postBtnSelectors) {
        const btn = await activePage.$(bSel);
        if (btn && await btn.isVisible()) {
          const isDisabled = await btn.isDisabled();
          if (!isDisabled) {
            await btn.click();
            clickedPost = true;
            break;
          }
        }
      }
    } catch (_) {}

    // Nếu chưa bấm nút thì nhấn phím Enter
    if (!clickedPost) {
      await activePage.keyboard.press('Enter');
    }

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
