import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/features/auth/AuthContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        socketRef.current?.emit('joinPmRoom', { pmUuid: user.id });
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  return socketRef.current;
}
