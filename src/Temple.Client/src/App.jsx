import React, { useState, useEffect, useMemo } from 'react';
import { useTempleRpc } from './hooks/useTempleRpc';
import { TempleAudioEngine } from './utils/audio';
import TempleStage from './components/TempleStage';
import BothiStage from './components/BothiStage';
import PhongSinhStage from './components/PhongSinhStage';
import XinChuStage from './components/XinChuStage';
import QuickDock from './components/QuickDock';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const { state, activeEvent, connected, callRpc } = useTempleRpc();
  const audio = useMemo(() => new TempleAudioEngine(), []);

  const [isAdminView, setIsAdminView] = useState(() => {
    return window.location.pathname === '/admin' || window.location.hash === '#admin';
  });

  const obsParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('obs');
  }, []);

  const obsMode = Boolean(obsParam);

  // Phân chia chế độ OBS:
  // - obs = 1: Theo cấu hình của trang main (state?.settings?.mode || 'temple')
  // - obs = 2: Cố định chế độ Bố thí ('bothi')
  // - obs = 3: Cố định chế độ Phóng sinh chim ('phongsinh')
  // - obs = 4: Cố định chế độ Xem quẻ / Thầy bói ('xinchu')
  const effectiveMode = useMemo(() => {
    if (obsParam === '2') return 'bothi';
    if (obsParam === '3') return 'phongsinh';
    if (obsParam === '4') return 'xinchu';
    return state?.settings?.mode || 'temple';
  }, [obsParam, state?.settings?.mode]);

  useEffect(() => {
    if (obsMode) {
      document.body.classList.add('obs-mode');
    } else {
      document.body.classList.remove('obs-mode');
    }
  }, [obsMode]);

  // Unlock audio context immediately and on first click/pointerdown
  useEffect(() => {
    audio.ensureContext();
    const unlock = () => {
      audio.ensureContext();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [audio]);

  // Sync background music with effectiveMode ('bothi' vs 'temple' vs 'phongsinh' vs 'xinchu') & YouTube
  useEffect(() => {
    audio.setMode(effectiveMode);

    // In bothi, phongsinh, and xinchu mode, dedicated background tracks/playlist play
    if (effectiveMode === 'bothi' || effectiveMode === 'phongsinh' || effectiveMode === 'xinchu') {
      audio.stopYouTube();
    } else {
      const ytUrl = state?.settings?.youtubeUrl;
      if (ytUrl) {
        audio.loadYouTube(ytUrl);
      } else {
        audio.stopYouTube();
      }
    }
  }, [effectiveMode, state?.settings?.youtubeUrl, audio]);

  if (isAdminView) {
    return (
      <AdminPanel
        state={state}
        callRpc={callRpc}
        onCloseAdmin={() => setIsAdminView(false)}
      />
    );
  }

  return (
    <div className="app-workspace">
      {effectiveMode === 'phongsinh' ? (
        <PhongSinhStage
          state={state}
          activeEvent={activeEvent}
          audio={audio}
          callRpc={callRpc}
          obsMode={obsMode}
        />
      ) : effectiveMode === 'bothi' ? (
        <BothiStage
          state={state}
          activeEvent={activeEvent}
          audio={audio}
          callRpc={callRpc}
          obsMode={obsMode}
        />
      ) : effectiveMode === 'xinchu' ? (
        <XinChuStage
          state={state}
          activeEvent={activeEvent}
          audio={audio}
          callRpc={callRpc}
          obsMode={obsMode}
        />
      ) : (
        <TempleStage
          state={state}
          activeEvent={activeEvent}
          audio={audio}
          callRpc={callRpc}
          obsMode={obsMode}
        />
      )}
      {!obsMode && (
        <QuickDock
          state={state}
          audio={audio}
          callRpc={callRpc}
          onOpenAdmin={() => setIsAdminView(true)}
        />
      )}
    </div>
  );
}

