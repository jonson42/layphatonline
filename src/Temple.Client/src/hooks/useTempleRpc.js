import { useState, useEffect, useRef, useCallback } from 'react';

export function useTempleRpc() {
  const [state, setState] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const rpcIdRef = useRef(1);
  const pendingRequests = useRef(new Map());

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${proto}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.method === 'temple.state') {
          setState(msg.params);
        } else if (msg.method === 'temple.event') {
          if (msg.params?.state) setState(msg.params.state);
          if (msg.params?.event) setActiveEvent(msg.params.event);
        } else if (msg.method === 'temple.viewerCount') {
          setState((prev) => prev ? {
            ...prev,
            tiktok: { ...prev.tiktok, viewerCount: msg.params.viewerCount }
          } : prev);
        } else if (msg.method === 'tiktok.commenterState') {
          setState((prev) => prev ? {
            ...prev,
            commenter: msg.params
          } : prev);
        } else if (msg.id != null && pendingRequests.current.has(msg.id)) {
          const { resolve, reject } = pendingRequests.current.get(msg.id);
          pendingRequests.current.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || 'RPC Error'));
          else resolve(msg.result);
        }
      } catch (err) {
        console.error('[WS Parse Error]', err);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const callRpc = useCallback(async (method, params = {}) => {
    const id = rpcIdRef.current++;
    const payload = { jsonrpc: '2.0', id, method, params };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return new Promise((resolve, reject) => {
        pendingRequests.current.set(id, { resolve, reject });
        wsRef.current.send(JSON.stringify(payload));
        setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            reject(new Error('RPC Timeout'));
          }
        }, 15000);
      });
    }

    // Fallback to HTTP POST /rpc
    try {
      const res = await fetch('/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`Máy chủ C# chưa bật hoặc đang bận (HTTP ${res.status}). Vui lòng khởi động start.bat!`);
      }
      const text = await res.text();
      if (!text || !text.trim()) {
        throw new Error('Máy chủ trả về dữ liệu rỗng. Vui lòng kiểm tra tiến trình Backend C# (port 5000)!');
      }
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error.message);
      return data.result;
    } catch (err) {
      if (window.location.port === '5173') {
        try {
          const res2 = await fetch('http://localhost:5000/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res2.ok) {
            const text2 = await res2.text();
            if (text2 && text2.trim()) {
              const data2 = JSON.parse(text2);
              if (data2.error) throw new Error(data2.error.message);
              return data2.result;
            }
          }
        } catch (_) {}
      }
      throw err;
    }
  }, []);

  return {
    state,
    setState,
    activeEvent,
    connected,
    callRpc
  };
}

