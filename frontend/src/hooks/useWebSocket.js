import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';

export function useWebSocket({ onMessage, types } = {}) {
  const { subscribe, subscribeToAll, status, reconnectAttempt, lastConnected } = useWebSocketContext();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!onMessageRef.current) return;
    const handler = (data) => { onMessageRef.current?.(data); };
    if (types && types.length > 0) {
      const unsubs = types.map((t) => subscribe(t, handler));
      return () => unsubs.forEach((u) => u());
    }
    return subscribeToAll(handler);
  }, [subscribe, subscribeToAll, types]);

  return { status, reconnectAttempt, lastConnected };
}
