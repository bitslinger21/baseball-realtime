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

  // Create socket once, and only leave on REAL unmount (not on providerGameId changes)
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

      // If we already have a game selected by the time we connect, join it
      const gid = joinedGameIdRef.current;
      if (gid != null) {
        // eslint-disable-next-line no-console
        console.log("[socket] joinGame (on connect)", gid);
        socket.emit("joinGame", gid);
      }
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
      if (msg.alert != null) {
        setAlerts((prev) => [...prev, msg.alert as GameAlert]);
      }
      if (msg.play != null) {
        setPlays((prev) => [...prev, msg.play as PlayUpdate]);
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

      socket.disconnect();
      socketRef.current = null;

      setIsConnected(false);
      setConnectionError(null);
    };
  }, []);

  // Join / switch games.
  // IMPORTANT: no cleanup here — StrictMode will run cleanup during dev and you’ll instantly leave.
  useEffect((): void => {
    const socket: Socket | null = socketRef.current;
    const prev: string | null = joinedGameIdRef.current;

    // Update "current desired game" first (used by connect handler)
    joinedGameIdRef.current = providerGameId;

    // If socket isn't ready yet, connect handler will join when it connects
    if (socket == null) return;

    // Leave previous if switching
    if (prev != null && prev !== providerGameId) {
      // eslint-disable-next-line no-console
      console.log("[socket] leaveGame (switch)", prev);
      socket.emit("leaveGame", prev);
    }

    // Join current
    if (providerGameId != null) {
      // eslint-disable-next-line no-console
      console.log("[socket] joinGame", providerGameId);
      socket.emit("joinGame", providerGameId);

      // reset local state for the new game
      setPlays([]);
      setAlerts([]);
    }
  }, [providerGameId]);

  return { plays, alerts, isConnected, connectionError };
}
