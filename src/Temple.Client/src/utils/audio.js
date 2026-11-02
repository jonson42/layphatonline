/**
 * TempleAudioEngine
 * - Nhạc nền: Phát trực tiếp file "Nam Mô A Di Đà Phật.m4a" (/assets/bg_chant.m4a) lặp vô tận êm dịu,
 *   tự động hạ nhỏ âm lượng (ducking) khi có giọng đọc lời khấn để không bị đè tiếng hay rè/xước.
 * - Pháp khí: Tổng hợp tiếng Mõ gỗ, Đại Hồng Chung, Ống xăm nhẹ nhàng, không vượt ngưỡng 0dBFS.
 * - Giọng đọc: Hàng đợi ZeroTTS phát tuần tự mượt mà.
 */
class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.sfxEnabled = true;
    this.bgMusicEnabled = true;
    this.ttsEnabled = true;
    this.ttsVoice = 'maichi';

    // Nhạc nền "Nam Mô A Di Đà Phật.m4a" — mặc định 65%, cho phép chỉnh trực tiếp 0% - 100%
    const savedMusicVol = parseFloat(localStorage.getItem('temple_music_vol'));
    const savedTtsVol = parseFloat(localStorage.getItem('temple_tts_vol'));
    this.bgBaseVolume = Number.isFinite(savedMusicVol) ? Math.max(0, Math.min(1, savedMusicVol)) : 0.65;
    this.ttsVolume = Number.isFinite(savedTtsVol) ? Math.max(0, Math.min(1, savedTtsVol)) : 0.95;

    this.useSynthMusicFallback = false;
    this.synthBgTimer = null;
    this.currentMode = 'temple';
    this.currentTrackSrc = '/assets/bg_chant.m4a';
    this.bgAudio = new Audio(this.currentTrackSrc);
    this.bgAudio.loop = true;
    this.bgAudio.preload = 'auto';
    this.bgAudio.volume = this.bgBaseVolume;
    this.bgAudio.onerror = () => {
      this.useSynthMusicFallback = true;
    };
    this.currentYoutubeId = null;
    this.activeYoutubeId = null;
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytCreating = false;
    this.ytPlayerReady = false;
    this.initYouTubeApi();
    this.ttsQueue = [];
    this.ttsPlaying = false;
    this.currentAudio = null;
    this.onTtsStateChange = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
    if (this.bgMusicEnabled) {
      this.startZenAmbience();
    }
    return this.ctx;
  }

  // --------------------------------------------------------------------------
  // 1. NHẠC NỀN "NAM MÔ A DI ĐÀ PHẬT.M4A" (CÓ AUTO-DUCKING KHI ĐỌC LỜI KHẤN)
  // --------------------------------------------------------------------------
  getDuckedVolume() {
    return Math.max(0.08, +(this.bgBaseVolume * 0.35).toFixed(2));
  }

  setMusicVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol)));
    if (!Number.isFinite(v)) return;
    this.bgBaseVolume = v;
    try {
      localStorage.setItem('temple_music_vol', String(v));
    } catch (_) {}
    if (this.bgAudio && !this.useSynthMusicFallback) {
      this.bgAudio.volume = this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume;
    }
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === "function") {
      try {
        const targetVol = this.ttsPlaying ? this.getDuckedVolume() * 100 : this.bgBaseVolume * 100;
        this.ytPlayer.setVolume(Math.round(targetVol));
      } catch (_) {}
    }
  }

  setTtsVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol)));
    if (!Number.isFinite(v)) return;
    this.ttsVolume = v;
    try {
      localStorage.setItem('temple_tts_vol', String(v));
    } catch (_) {}
    if (this.currentAudio) {
      this.currentAudio.volume = this.ttsVolume;
    }
  }

  setMode(mode) {
    const isBothi = mode === 'bothi';
    const targetSrc = isBothi ? '/assets/khong_can_di_lam.mp3' : '/assets/bg_chant.m4a';

    if (this.currentMode === mode && this.currentTrackSrc === targetSrc && this.bgAudio) {
      return;
    }

    this.currentMode = mode;
    this.currentTrackSrc = targetSrc;
    this.useSynthMusicFallback = false;

    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
      } catch (_) {}
    }

    this.bgAudio = new Audio(targetSrc);
    this.bgAudio.loop = true;
    this.bgAudio.preload = 'auto';
    this.bgAudio.volume = this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume;
    this.bgAudio.onerror = () => {
      if (isBothi && this.bgAudio.src.indexOf('/tts-cache/') === -1) {
        this.bgAudio.src = '/tts-cache/khong_can_di_lam.mp3';
        if (this.bgMusicEnabled && this.unlocked && !this.activeYoutubeId) {
          this.bgAudio.play().catch(() => {});
        }
      } else {
        this.useSynthMusicFallback = true;
        if (this.bgMusicEnabled && this.unlocked && !this.activeYoutubeId) {
          this.startDefaultZenSynthLoop();
        }
      }
    };

    if (this.bgMusicEnabled && this.unlocked && !this.activeYoutubeId) {
      this.startZenAmbience();
    }
  }

  startZenAmbience() {
    if (!this.bgMusicEnabled) return;
    if (this.activeYoutubeId) return;
    if (this.useSynthMusicFallback) {
      this.startDefaultZenSynthLoop();
      return;
    }
    try {
      this.bgAudio.volume = this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume;
      if (this.bgAudio.paused) {
        const p = this.bgAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            if (this.bgAudio.error) {
              if (this.currentMode === 'bothi' && this.bgAudio.src.indexOf('/tts-cache/') === -1) {
                this.bgAudio.src = '/tts-cache/khong_can_di_lam.mp3';
                this.bgAudio.play().catch(() => {});
              } else {
                this.useSynthMusicFallback = true;
                this.startDefaultZenSynthLoop();
              }
            }
          });
        }
      }
    } catch (_) {
      this.useSynthMusicFallback = true;
      this.startDefaultZenSynthLoop();
    }
  }

  startDefaultZenSynthLoop() {
    if (!this.bgMusicEnabled || this.synthBgTimer) return;
    const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let step = 0;
    const playZenNote = () => {
      if (!this.bgMusicEnabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const freq = PENTATONIC[step % PENTATONIC.length];
        step++;
        const vol = (this.ttsPlaying ? this.getDuckedVolume() : this.bgBaseVolume) * 0.18;
        if (vol <= 0.002) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(now);
        osc.stop(now + 4.25);
      } catch (_) {}
    };
    playZenNote();
    this.synthBgTimer = setInterval(playZenNote, 3600);
  }

  stopZenAmbience() {
    try {
      this.bgAudio.pause();
    } catch (_) {}
    if (this.synthBgTimer) {
      clearInterval(this.synthBgTimer);
      this.synthBgTimer = null;
    }
  }

  setBgDucking(ducked) {
    if (!this.bgMusicEnabled) return;
    try {
      if (!this.useSynthMusicFallback && this.bgAudio) {
        this.bgAudio.volume = ducked ? this.getDuckedVolume() : this.bgBaseVolume;
      }
      if (this.ytPlayer && typeof this.ytPlayer.setVolume === "function") {
        const targetVol = ducked ? this.getDuckedVolume() * 100 : this.bgBaseVolume * 100;
        this.ytPlayer.setVolume(Math.round(targetVol));
      }
    } catch (_) {}
  }


  // --------------------------------------------------------------------------
  // 1B. PHÁT NHẠC / KINH TỤNG TỪ YOUTUBE (TỰ ĐỘNG LẶP + DUCKING KHI ĐỌC KHẤN)
  // --------------------------------------------------------------------------
  initYouTubeApi() {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      this.ytReady = true;
      return;
    }
    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        this.ytReady = true;
        if (typeof prev === 'function') prev();
        if (this.currentYoutubeId && !this.ytPlayer) {
          this.createYouTubePlayer(this.currentYoutubeId);
        }
      };
    }
  }

  extractYouTubeId(urlOrId) {
    if (!urlOrId) return null;
    const str = String(urlOrId).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const m = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
    return m ? m[1] : null;
  }

  loadYouTube(urlOrId) {
    const videoId = this.extractYouTubeId(urlOrId);
    if (!videoId) return false;

    // Ngăn chặn gọi trùng lặp nếu đang phát hoặc đang tải đúng bài này
    if (this.activeYoutubeId === videoId && (this.ytPlayer || this.ytCreating)) {
      return true;
    }

    this.activeYoutubeId = videoId;
    this.currentYoutubeId = videoId;

    if (this.bgAudio) {
      try { this.bgAudio.pause(); } catch (_) {}
    }
    if (this.synthBgTimer) {
      clearInterval(this.synthBgTimer);
      this.synthBgTimer = null;
    }

    if (this.ytPlayer && this.ytPlayerReady && typeof this.ytPlayer.loadVideoById === 'function') {
      try {
        this.ytPlayer.loadVideoById(videoId);
        this.ytPlayer.setVolume(Math.round(this.bgBaseVolume * 100));
        this.ytPlayer.playVideo();
      } catch (_) {}
    } else if (window.YT && window.YT.Player) {
      this.createYouTubePlayer(videoId);
    } else {
      this.initYouTubeApi();
    }
    return true;
  }

  createYouTubePlayer(videoId) {
    if (typeof document === 'undefined') return;
    if (this.ytCreating) return;
    this.ytCreating = true;

    // Hủy player cũ nếu có để tránh tồn tại nhiều iframe cùng lúc gây vọng tiếng (echo)
    if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
      try { this.ytPlayer.destroy(); } catch (_) {}
      this.ytPlayer = null;
      this.ytPlayerReady = false;
    }

    let holder = document.getElementById('temple-yt-audio-container');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'temple-yt-audio-container';
      holder.style.position = 'fixed';
      holder.style.bottom = '-9999px';
      holder.style.left = '-9999px';
      holder.style.width = '240px';
      holder.style.height = '240px';
      holder.style.opacity = '0.01';
      holder.style.pointerEvents = 'none';
      holder.style.zIndex = '-999';
      document.body.appendChild(holder);
    }

    // Đảm bảo chỉ có 1 thẻ target duy nhất trong DOM
    holder.innerHTML = '<div id="temple-yt-player-target"></div>';

    try {
      this.ytPlayer = new window.YT.Player('temple-yt-player-target', {
        width: '240',
        height: '240',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            this.ytCreating = false;
            this.ytPlayerReady = true;
            try {
              event.target.setVolume(Math.round(this.bgBaseVolume * 100));
              const pState = typeof event.target.getPlayerState === 'function' ? event.target.getPlayerState() : -1;
              if (pState !== 1) {
                event.target.playVideo();
              }
            } catch (_) {}
          },
          onStateChange: (event) => {
            if (window.YT && event.data === window.YT.PlayerState.ENDED) {
              try { event.target.playVideo(); } catch (_) {}
            }
          },
          onError: () => {
            this.ytCreating = false;
          }
        }
      });
    } catch (e) {
      this.ytCreating = false;
      console.warn('[YouTube Player Error]', e);
    }
  }

  stopYouTube() {
    this.activeYoutubeId = null;
    this.currentYoutubeId = null;
    this.ytCreating = false;
    if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
      try { this.ytPlayer.stopVideo(); } catch (_) {}
    }
    if (this.bgMusicEnabled) {
      this.startZenAmbience();
    }
  }

  pauseMusic() {
    this.stopZenAmbience();
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (_) {}
    }
  }

  resumeMusic() {
    if (this.activeYoutubeId) {
      if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
        try { this.ytPlayer.playVideo(); } catch (_) {}
      }
    } else {
      this.startZenAmbience();
    }
  }

  // --------------------------------------------------------------------------
  // 2. TIẾNG MÕ GỖ TỤNG KINH (WOODEN FISH PERCUSSION SYNTH)
  // --------------------------------------------------------------------------
  playWoodenFish(pitchMultiplier = 1.0) {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const baseFreq = 620 * pitchMultiplier * (0.98 + Math.random() * 0.04);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq * 1.4, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.018);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, now + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 1.15, now);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.onended = () => {
        osc1.disconnect();
        filter.disconnect();
        gain.disconnect();
      };

      osc1.start(now);
      osc1.stop(now + 0.16);
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 3. TIẾNG ĐẠI HỒNG CHUNG (TEMPLE BRONZE BELL)
  // --------------------------------------------------------------------------
  playTempleBell(intensity = 1.0) {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      const base = 174;
      const partials = [
        { ratio: 0.5, amp: 0.22, decay: 4.2 },
        { ratio: 1.0, amp: 0.35, decay: 3.6 },
        { ratio: 1.506, amp: 0.16, decay: 2.4 },
        { ratio: 2.0, amp: 0.18, decay: 1.9 }
      ];

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.28 * Math.min(1.0, intensity), now);
      master.connect(ctx.destination);

      partials.forEach((p, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base * p.ratio, now);

        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(p.amp, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(g);
        g.connect(master);
        osc.onended = () => {
          osc.disconnect();
          g.disconnect();
          if (idx === 0) master.disconnect();
        };
        osc.start(now);
        osc.stop(now + p.decay + 0.05);
      });
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 4. TIẾNG LẮC ỐNG XĂM TRE (FORTUNE STICK SHAKER)
  // --------------------------------------------------------------------------
  playFortuneShake() {
    if (!this.sfxEnabled) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playWoodenFish(1.32 + (i % 2) * 0.16);
      }, i * 120);
    }
  }

  // --------------------------------------------------------------------------
  // 5. TIẾNG CHUÔNG NGỌC DÂNG LỄ / THẮP HƯƠNG (SINGING CHIME)
  // --------------------------------------------------------------------------
  playIncenseChime() {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const notes = [528, 660];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.10, now + idx * 0.1 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 1.15);
      });
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 5b. ÂM THANH BỐ THÍ & XIN TIỀN UỐNG BIA
  // --------------------------------------------------------------------------
  playCoinDrop() {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      // Giả lập 2-3 tiếng đồng xu leng keng va vào bát nhôm
      const hits = [0, 0.06, 0.13];
      hits.forEach((offset, idx) => {
        const t = now + offset;
        const freqs = [2400 + Math.random() * 200, 3800 + Math.random() * 300, 5200 + Math.random() * 400];
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.08 / (idx + 1), t + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.2);
        });
      });
    } catch (_) {}
  }

  playHeartPop() {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }

  playBeerCheers() {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      // Tiếng chạm cốc bia leng keng vui vẻ
      [1800, 2200, 3100].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
      });
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 6. ZEROTTS VOICE QUEUE & PREFETCHER
  // --------------------------------------------------------------------------
  enqueueTts(text, options = {}) {
    const onStart = typeof options.onStart === 'function' ? options.onStart : null;
    const onEnd = typeof options.onEnd === 'function' ? options.onEnd : null;

    if (!this.ttsEnabled) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 5500);
      return;
    }
    const clean = String(text || '').trim();
    if (!clean) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 5500);
      return;
    }

    const now = Date.now();
    if (this.lastTtsText === clean && (now - (this.lastTtsTime || 0) < 20000)) {
      if (onStart) onStart();
      if (onEnd) setTimeout(onEnd, 3000);
      return;
    }
    this.lastTtsText = clean;
    this.lastTtsTime = now;

    if (this.ttsQueue.length >= 6) {
      const dropped = this.ttsQueue.shift();
      if (dropped?.onStart) dropped.onStart();
      if (dropped?.onEnd) dropped.onEnd();
    }

    const item = {
      id: `tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      voice: (options.voice || this.ttsVoice || 'maichi').toLowerCase(),
      url: options.url || null,
      onStart,
      onEnd,
      fetchPromise: null
    };

    if (!item.url) {
      item.fetchPromise = this.fetchZeroTtsAudio(item.text, item.voice);
    }

    this.ttsQueue.push(item);
    this.processTtsQueue();
  }

  async fetchZeroTtsAudio(text, voice = 'maichi') {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice })
      });
      const data = await res.json();
      if (data && data.ok && data.url) {
        return data;
      }
      return { ok: false, error: data?.error || 'ZeroTTS unavailable' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async processTtsQueue() {
    if (this.ttsPlaying || this.ttsQueue.length === 0) return;
    this.ttsPlaying = true;
    const item = this.ttsQueue.shift();

    try {
      let audioUrl = item.url;
      if (!audioUrl && item.fetchPromise) {
        const res = await item.fetchPromise;
        if (res && res.ok && res.url) {
          audioUrl = res.url;
        }
      }

      if (audioUrl) {
        this.setBgDucking(true);
        if (this.onTtsStateChange) {
          this.onTtsStateChange({ speaking: true, synthesizing: false, text: item.text });
        }
        if (item.onStart) item.onStart();
        await this.playWavUrl(audioUrl);
        if (item.onEnd) item.onEnd();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.setBgDucking(true);
        if (item.onStart) item.onStart();
        await new Promise((resolve) => {
          const utt = new SpeechSynthesisUtterance(item.text);
          utt.lang = 'vi-VN';
          utt.rate = 0.92;
          utt.onend = () => resolve();
          utt.onerror = () => resolve();
          window.speechSynthesis.speak(utt);
        });
        if (item.onEnd) item.onEnd();
      } else {
        if (item.onStart) item.onStart();
        if (item.onEnd) setTimeout(item.onEnd, 3500);
      }
    } catch (err) {
      console.warn('[ZeroTTS Playback Warning]', err);
      if (item.onStart) item.onStart();
      if (item.onEnd) item.onEnd();
    } finally {
      this.ttsPlaying = false;
      if (this.ttsQueue.length === 0) {
        this.setBgDucking(false);
        if (this.onTtsStateChange) {
          this.onTtsStateChange({ speaking: false, synthesizing: false, text: '' });
        }
      } else {
        setTimeout(() => this.processTtsQueue(), 250);
      }
    }
  }

  playWavUrl(url) {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        this.currentAudio = audio;
        audio.volume = this.ttsVolume;
        audio.onended = () => {
          this.currentAudio = null;
          resolve();
        };
        audio.onerror = () => {
          this.currentAudio = null;
          resolve();
        };
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            this.currentAudio = null;
            resolve();
          });
        }
      } catch (_) {
        resolve();
      }
    });
  }
}

window.TempleAudioEngine = TempleAudioEngine;

export { TempleAudioEngine };
export default TempleAudioEngine;
