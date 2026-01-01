import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  PlayUpdate,
  GameAlert,
  RealtimeState,
  GameWirePayload,
} from "./types";

const SOCKET_URL = "http://localhost:3000/realtime";

export type RealtimeGameControls = RealtimeState & {
  activeGameId: string | null;              // what we are currently watching
  isActive: (gameId: string) => boolean;    // helper for buttons
  toggleGame: (gameId: string) => void;     // Option 1 + Option 3
};

export function useRealtimeGame(selectedGameId: string | null): RealtimeGameControls {
  const [plays, setPlays] = useState<readonly PlayUpdate[]>([]);
  const [alerts, setAlerts] = useState<readonly GameAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // This is the actual joined/watching game
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeGameIdRef = useRef<string | null>(null);

  // Create socket once; leave on REAL unmount only
  useEffect((): () => void => {
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] connected", socket.id);
      setIsConnected(true);
      setConnectionError(null);

      // On reconnect, re-join active game if any
      const gid = activeGameIdRef.current;
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

      const joined: string | null = activeGameIdRef.current;
      if (joined != null) {
        // eslint-disable-next-line no-console
        console.log("[socket] leaveGame (unmount)", joined);
        socket.emit("leaveGame", joined);
        activeGameIdRef.current = null;
      }

      socket.disconnect();
      socketRef.current = null;

      setIsConnected(false);
      setConnectionError(null);
    };
  }, []);

  // keep ref in sync with state for connect/reconnect handler
  useEffect(() => {
    activeGameIdRef.current = activeGameId;
  }, [activeGameId]);

  const toggleGame = (gameId: string): void => {
    const socket = socketRef.current;
    const prev = activeGameIdRef.current;

    // Optimistic update (Option 3)
    if (prev === gameId) {
      // turn off
      setActiveGameId(null);
      setPlays([]);
      setAlerts([]);

      if (socket != null) {
        // eslint-disable-next-line no-console
        console.log("[socket] leaveGame (toggle off)", gameId);
        socket.emit("leaveGame", gameId);
      }
      return;
    }

    // switching on (and switching from another game if needed)
    setActiveGameId(gameId);
    setPlays([]);
    setAlerts([]);

    if (socket == null) return;

    if (prev != null) {
      // eslint-disable-next-line no-console
      console.log("[socket] leaveGame (toggle switch)", prev);
      socket.emit("leaveGame", prev);
    }

    // eslint-disable-next-line no-console
    console.log("[socket] joinGame (toggle on)", gameId);
    socket.emit("joinGame", gameId);
  };

  const isActive = (gameId: string): boolean => activeGameIdRef.current === gameId;

  // If selected game changes (e.g., user clicks another row), we do NOTHING automatically.
  // The button toggle controls whether we join/leave. This is the core of Option 1.
  // selectedGameId is still useful to the UI, but not a side-effect trigger.

  return {
    plays,
    alerts,
    isConnected,
    connectionError,
    activeGameId,
    isActive,
    toggleGame,
  };
}
