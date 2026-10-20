import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useRealtime() {
  const { token, isAuthenticated } = useAuthStore();
  const { setMetrics } = useAnalyticsStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(`${BACKEND_URL}/realtime`, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connected', (data) => {
        console.log('Real-time: Connected to tenant room', data.tenantId);
      });

      socketRef.current.on('metrics_update', (metrics) => {
        setMetrics(metrics);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Real-time: Disconnected');
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Real-time: Connection error', err.message);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, setMetrics]);

  return socketRef.current;
}
