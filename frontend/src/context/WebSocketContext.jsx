import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';
const WS_URL = API_URL.replace('http', 'ws') + '/ws';
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_DELAY = 1000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 20;

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const listenersRef = useRef({});
  const reconnectTimeoutRef = useRef(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const statusRef = useRef('disconnected');
  const prevStatusRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lastPongRef = useRef(Date.now());
  const messageBufferRef = useRef([]);
  const flushTimeoutRef = useRef(null);

  const [status, setStatus] = useState('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastConnected, setLastConnected] = useState(null);

  const getToken = useCallback(() => {
    try { return JSON.parse(sessionStorage.getItem('karthik_ec_access_token')); } catch { return null; }
  }, []);

  const flushMessages = useCallback(() => {
    if (messageBufferRef.current.length === 0) return;
    const data = messageBufferRef.current;
    messageBufferRef.current = [];
    const byType = listenersRef.current[data.type];
    if (byType) byType.forEach((cb) => { try { cb(data); } catch {} });
    const all = listenersRef.current['*'];
    if (all) all.forEach((cb) => { try { cb(data); } catch {} });
  }, []);

  const dispatch = useCallback((data) => {
    const byType = listenersRef.current[data.type];
    if (byType) byType.forEach((cb) => { try { cb(data); } catch {} });
    const all = listenersRef.current['*'];
    if (all) all.forEach((cb) => { try { cb(data); } catch {} });
  }, []);

  const startHeartbeat = useCallback((ws) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    lastPongRef.current = Date.now();
    heartbeatRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('__ping__');
        if (Date.now() - lastPongRef.current > 45000) {
          ws.close();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !mountedRef.current) return;

    if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setStatus('disconnected');
      return;
    }

    statusRef.current = 'connecting';
    setStatus('connecting');

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      setReconnectAttempt(0);
      statusRef.current = 'connected';
      setStatus('connected');
      setLastConnected(new Date());
      startHeartbeat(ws);
    };

    ws.onmessage = (event) => {
      if (event.data === '__pong__') { lastPongRef.current = Date.now(); return; }
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') return;
        dispatch(data);
      } catch {}
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      statusRef.current = 'disconnected';
      setStatus('disconnected');
      if (!token || event.code === 4002 || event.code === 4003 || event.code === 4004) return;
      const delay = Math.min(INITIAL_DELAY * Math.pow(2, attemptRef.current), MAX_RECONNECT_DELAY);
      const jitter = Math.random() * 1000;
      attemptRef.current += 1;
      setReconnectAttempt(attemptRef.current);
      statusRef.current = 'reconnecting';
      setStatus('reconnecting');
      reconnectTimeoutRef.current = setTimeout(() => { if (mountedRef.current) connect(); }, delay + jitter);
    };

    ws.onerror = () => { ws.close(); };
  }, [getToken, dispatch, startHeartbeat]);

  useEffect(() => {
    mountedRef.current = true;
    if (user) connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, connect]);

  useEffect(() => {
    if (prevStatusRef.current === null) { prevStatusRef.current = status; return; }
    if (status === 'connected' && prevStatusRef.current === 'reconnecting') {
      toast.success('Real-time connection restored', { id: 'ws-reconnect', duration: 3000 });
    }
    if (status === 'reconnecting') {
      toast.loading('Reconnecting to live server...', { id: 'ws-reconnecting', duration: Infinity });
    }
    if (status === 'connected' && prevStatusRef.current !== 'connected') {
      toast.dismiss('ws-reconnecting');
    }
    prevStatusRef.current = status;
  }, [status]);

  const subscribe = useCallback((type, callback) => {
    if (!listenersRef.current[type]) listenersRef.current[type] = new Set();
    listenersRef.current[type].add(callback);
    return () => { listenersRef.current[type]?.delete(callback); };
  }, []);

  const subscribeToAll = useCallback((callback) => subscribe('*', callback), [subscribe]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{
      status, reconnectAttempt, lastConnected,
      subscribe, subscribeToAll, sendMessage,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return ctx;
}
