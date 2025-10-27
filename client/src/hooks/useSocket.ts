import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LiveUpdate } from '../types';

export function useSocket(gameId: string, onUpdate: (u: LiveUpdate) => void) {
  const socketRef = useRef<Socket | null>(null);
  const lastJoinedGameIdRef = useRef<string | null>(null);

  useEffect(() => {
    // If we already have a socket (HMR or re-renders), clean it up first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io('http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: false,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      console.log('✅ connected', socket.id);
      // Join the room after connect (or reconnect)
      if (gameId && lastJoinedGameIdRef.current !== gameId) {
        socket.emit('join', { gameId });
        lastJoinedGameIdRef.current = gameId;
      }
    };

    const onUpgrade = (transport: any) => {
      console.log('🔄 upgraded to', transport?.name);
    };

    const onUpdateEvent = (payload: Partial<LiveUpdate>) => {
      const merged: LiveUpdate = {
        ...(payload as LiveUpdate),
        gameId: payload?.gameId ?? gameId,
      };
      onUpdate(merged);
    };

    const onError = (e: any) => {
      console.error('connect_error', e?.message ?? e);
    };

    socket.on('connect', onConnect);
    socket.io.engine.on('upgrade', onUpgrade as any);
    socket.on('game:update', onUpdateEvent);
    socket.on('connect_error', onError);

    // If already connected (e.g., fast refresh), ensure we’re joined
    if (socket.connected && gameId && lastJoinedGameIdRef.current !== gameId) {
      socket.emit('join', { gameId });
      lastJoinedGameIdRef.current = gameId;
    }

    return () => {
      socket.off('connect', onConnect);
      socket.io.engine.off('upgrade', onUpgrade as any);
      socket.off('game:update', onUpdateEvent);
      socket.off('connect_error', onError);
      socket.disconnect();
      socketRef.current = null;
      // keep lastJoinedGameIdRef as-is; it will be re-checked on reconnect
    };
  }, [gameId, onUpdate]);

  // If the gameId changes while connected, emit join for the new game
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    if (s.connected && gameId && lastJoinedGameIdRef.current !== gameId) {
      s.emit('join', { gameId });
      lastJoinedGameIdRef.current = gameId;
    }
  }, [gameId]);

  return socketRef.current;
}
