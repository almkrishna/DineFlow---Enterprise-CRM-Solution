import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url) => {
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer = null;

    const connect = () => {
      if (disposed) return;
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          setMessages((prev) => [...prev, data]);
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 3000); // Reconnect after 3s
        }
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.current.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return { messages, lastMessage, isConnected };
};
