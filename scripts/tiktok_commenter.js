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

// Đường dẫn profile lưu session đăng nhập vĩnh viễn
const profileDir = path.resolve(__dirname, '..', 'data', 'tiktok_browser_profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
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
      emit({ type: 'status', running: false, loggedIn: false, message: 'Trình duyệt đã đóng' });
    }
  });

  return context;
}

async function checkLoggedIn(page) {
  if (!page) return false;
  try {
    const hasUserAvatar = await page.evaluate(() => {
      // Tìm avatar người dùng đăng nhập ở góc trên cùng TikTok
      const avatar = document.querySelector('header img[class*="Avatar"], [data-e2e="profile-icon"], img[src*="avatar"]');
      const loginBtn = document.querySelector('[data-e2e="top-login-button"], [id*="login-button"]');
      if (loginBtn) return false;
      return !!avatar;
    });
    return !!hasUserAvatar;
  } catch (_) {
    return false;
  }
}

async function openLive(url, headless = false) {
  try {
    isClosing = false;
    currentLiveUrl = url;
    emit({ type: 'status', running: true, message: `Đang mở trình duyệt kết nối ${url}...` });

    const ctx = await getBrowserContext(headless);
    const pages = ctx.pages();
    activePage = pages.length > 0 ? pages[0] : await ctx.newPage();

    await activePage.goto(url, { timeout: 35000, waitUntil: 'domcontentloaded' });
    await activePage.waitForTimeout(3000);

    const loggedIn = await checkLoggedIn(activePage);
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
    emit({ type: 'status', running: true, message: 'Đang mở cửa sổ đăng nhập TikTok...' });
    // Mở headful để người dùng thấy và quét mã QR hoặc đăng nhập
    const ctx = await getBrowserContext(false);
    const pages = ctx.pages();
    activePage = pages.length > 0 ? pages[0] : await ctx.newPage();

    await activePage.goto('https://www.tiktok.com/login', { timeout: 35000, waitUntil: 'domcontentloaded' });
    emit({
      type: 'status',
      running: true,
      message: 'Vui lòng quét mã QR hoặc đăng nhập tài khoản TikTok trên cửa sổ trình duyệt vừa mở.'
    });
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
      'textarea[placeholder*="bình luận" i]',
      'textarea[placeholder*="comment" i]',
      '[placeholder*="Gửi bình luận" i]',
      '[placeholder*="Add comment" i]',
      '[placeholder*="Send a comment" i]',
      '[placeholder*="Say something" i]',
      'div[class*="ChatInputContainer"] [contenteditable="true"]',
      'div[class*="DivChatRoom"] [contenteditable="true"]'
    ];

    let inputElement = null;
    for (const sel of candidateSelectors) {
      try {
        const el = await activePage.$(sel);
        if (el) {
          const isVisible = await el.isVisible();
          if (isVisible) {
            inputElement = el;
            break;
          }
        }
      } catch (_) {}
    }

    if (!inputElement) {
      // Kiểm tra xem có đang yêu cầu đăng nhập không
      const loggedIn = await checkLoggedIn(activePage);
      emit({
        type: 'comment_result',
        success: false,
        error: loggedIn
          ? 'Không tìm thấy ô nhập chat trên giao diện Live'
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
    emit({ type: 'status', running: false, loggedIn: false, message: 'Đã đóng trình duyệt Playwright' });
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
            loggedIn: activePage ? await checkLoggedIn(activePage) : false,
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

// Báo hiệu script đã khởi động thành công
emit({ type: 'ready', message: 'TikTok Playwright Commenter Bridge đã sẵn sàng' });

