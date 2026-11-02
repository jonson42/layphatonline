import React, { useState, useEffect, useMemo } from 'react';
import { useTempleRpc } from './hooks/useTempleRpc';
import { TempleAudioEngine } from './utils/audio';
import TempleStage from './components/TempleStage';
import BothiStage from './components/BothiStage';
import PhongSinhStage from './components/PhongSinhStage';
import QuickDock from './components/QuickDock';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const { state, activeEvent, connected, callRpc } = useTempleRpc();
  const audio = useMemo(() => new TempleAudioEngine(), []);

  const [isAdminView, setIsAdminView] = useState(() => {
    return window.location.pathname === '/admin' || window.location.hash === '#admin';
  });

  const obsMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('obs') === '1';
  }, []);

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

  // Sync background music with mode ('bothi' vs 'temple') & YouTube
  useEffect(() => {
    const isBothi = state?.settings?.mode === 'bothi';
    audio.setMode(isBothi ? 'bothi' : 'temple');

    // In bothi mode, khong_can_di_lam.mp3 is the dedicated background track
    if (isBothi) {
      audio.stopYouTube();
    } else {
      const ytUrl = state?.settings?.youtubeUrl;
      if (ytUrl) {
        audio.loadYouTube(ytUrl);
      } else {
        audio.stopYouTube();
      }
    }
  }, [state?.settings?.mode, state?.settings?.youtubeUrl, audio]);

  if (isAdminView) {
    return (
      <AdminPanel
        state={state}
        callRpc={callRpc}
        onCloseAdmin={() => setIsAdminView(false)}
      />
    );
  }

  const currentMode = state?.settings?.mode || 'temple';

  return (
    <div className="app-workspace">
      {currentMode === 'phongsinh' ? (
        <PhongSinhStage
          state={state}
          activeEvent={activeEvent}
          audio={audio}
          callRpc={callRpc}
          obsMode={obsMode}
        />
      ) : currentMode === 'bothi' ? (
        <BothiStage
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

