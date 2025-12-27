// client/src/realtime/useRealtimeGame.ts
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  PlayUpdate,
  GameAlert,
  RealtimeState,
  GameWirePayload,
} from "./types";

const SOCKET_URL = "http://localhost:3000/realtime";

export function useRealtimeGame(providerGameId: string | null): RealtimeState {
  const [plays, setPlays] = useState<readonly PlayUpdate[]>([]);
  const [alerts, setAlerts] = useState<readonly GameAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const joinedGameIdRef = useRef<string | null>(null);

  // Create socket once
  useEffect((): () => void => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] connected", socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      // eslint-disable-next-line no-console
      console.log("[socket] disconnected", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err: Error) => {
      // eslint-disable-next-line no-console
      console.log("[socket] connect_error", err.message);
      setIsConnected(false);
      setConnectionError(err.message);
    });

    const handlePlay = (msg: GameWirePayload): void => {
      // eslint-disable-next-line no-console
      console.log("[socket] RAW play event received", msg);

      if (msg.alert != null) {
        const alert: GameAlert = msg.alert;
        setAlerts((prev: readonly GameAlert[]): readonly GameAlert[] => {
          const next = [...prev, alert];
          // eslint-disable-next-line no-console
          console.log("[socket] alerts length now", next.length);
          return next;
        });
      }

      if (msg.play != null) {
        const play: PlayUpdate = msg.play;
        setPlays((prev: readonly PlayUpdate[]): readonly PlayUpdate[] => {
          const next = [...prev, play];
          // eslint-disable-next-line no-console
          console.log("[socket] plays length now", next.length, "last play:", play);
          return next;
        });
      }
    };

    socket.on("play", handlePlay);

    return (): void => {
      socket.off("play", handlePlay);

      const joined: string | null = joinedGameIdRef.current;
      if (joined != null) {
        // eslint-disable-next-line no-console
        console.log("[socket] leaveGame (unmount)", joined);
        socket.emit("leaveGame", joined);
        joinedGameIdRef.current = null;
      }

      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  // Join / switch games (enable on join, disable on leave)
  useEffect((): (() => void) | void => {
    const socket: Socket | null = socketRef.current;
    if (socket == null) return;

    const prevJoined: string | null = joinedGameIdRef.current;

    // If we were joined to a previous game, leave it first (disable)
    if (prevJoined != null && prevJoined !== providerGameId) {
      // eslint-disable-next-line no-console
      console.log("[socket] leaveGame", prevJoined);
      socket.emit("leaveGame", prevJoined);
      joinedGameIdRef.current = null;
    }

    // If a game is selected, join it (enable)
    if (providerGameId != null) {
      // eslint-disable-next-line no-console
      console.log("[socket] joinGame", providerGameId);
      socket.emit("joinGame", providerGameId);
      joinedGameIdRef.current = providerGameId;

      // reset local state for the new game
      setPlays([]);
      setAlerts([]);
    }

    // Cleanup runs when providerGameId changes OR hook unmounts
    return (): void => {
      const current: string | null = joinedGameIdRef.current;
      if (current != null) {
        // eslint-disable-next-line no-console
        console.log("[socket] leaveGame (cleanup)", current);
        socket.emit("leaveGame", current);
        joinedGameIdRef.current = null;
      }
    };
  }, [providerGameId]);

  return { plays, alerts, isConnected, connectionError };
}