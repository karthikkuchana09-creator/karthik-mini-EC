import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useWebSocket({ onMessage }) {
  const { user } = useAuth();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let ws;
    let reconnectTimeout;
    let attempt = 0;
    const maxDelay = 30000;

    function connect() {
      ws = new WebSocket(`ws://127.0.0.1:8000/ws?token=${token}`);

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {}
      };

      ws.onclose = () => {
        if (!localStorage.getItem('token')) return;
        const delay = Math.min(1000 * Math.pow(2, attempt), maxDelay);
        reconnectTimeout = setTimeout(() => {
          attempt++;
          connect();
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [user]);
}
