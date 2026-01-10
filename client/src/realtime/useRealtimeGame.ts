import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { PlayUpdate, GameAlert, RealtimeState, GameWirePayload } from "./types";

const SOCKET_URL = "http://localhost:3000/realtime";

export type RealtimeGameControls = RealtimeState & {
  // games currently being watched (rooms joined)
  watchedGameIds: readonly string[];

  // helper for buttons (▶/⏹ per card)
  isActive: (gameId: string) => boolean;

  // toggle watching for a given game (no longer forces leaving others)
  toggleGame: (gameId: string) => void;
};

type PlaysByGameId = Record<string, readonly PlayUpdate[]>;
type AlertsByGameId = Record<string, readonly GameAlert[]>;

export function useRealtimeGame(selectedGameId: string | null): RealtimeGameControls {
  const [playsByGameId, setPlaysByGameId] = useState<PlaysByGameId>({});
  const [alertsByGameId, setAlertsByGameId] = useState<AlertsByGameId>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // watched rooms
  const [watchedGameIds, setWatchedGameIds] = useState<Set<string>>(() => new Set());

  const socketRef = useRef<Socket | null>(null);
  const watchedRef = useRef<Set<string>>(new Set());

  // keep ref in sync (for connect/reconnect)
  useEffect(() => {
    watchedRef.current = watchedGameIds;
  }, [watchedGameIds]);

  // Create socket once; leave on REAL unmount only
  useEffect((): () => void => {
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] connected", socket.id);
      setIsConnected(true);
      setConnectionError(null);

      // Re-join all watched games on reconnect
      for (const gid of watchedRef.current) {
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
      // We must route messages to a game id.
      // PlayUpdateWire includes providerGameId. Alerts include gameId.
      const playAny = msg.play as unknown as { providerGameId?: string } | undefined;
      const alertAny = msg.alert as unknown as { gameId?: string } | undefined;

      const gid: string | null =
        typeof playAny?.providerGameId === "string"
          ? playAny.providerGameId
          : typeof alertAny?.gameId === "string"
            ? alertAny.gameId
            : null;

      if (gid == null || gid === "") return;

      if (msg.alert != null) {
        setAlertsByGameId((prev) => {
          const cur = prev[gid] ?? [];
          return { ...prev, [gid]: [...cur, msg.alert as GameAlert] };
        });
      }

      if (msg.play != null) {
        setPlaysByGameId((prev) => {
          const cur = prev[gid] ?? [];
          return { ...prev, [gid]: [...cur, msg.play as PlayUpdate] };
        });
      }
    };

    socket.on("play", handlePlay);

    return (): void => {
      socket.off("play", handlePlay);

      // leave all watched rooms on unmount
      for (const gid of watchedRef.current) {
        // eslint-disable-next-line no-console
        console.log("[socket] leaveGame (unmount)", gid);
        socket.emit("leaveGame", gid);
      }

      socket.disconnect();
      socketRef.current = null;

      setIsConnected(false);
      setConnectionError(null);
    };
  }, []);

  const toggleGame = (gameId: string): void => {
    const socket = socketRef.current;

    setWatchedGameIds((prev) => {
      const next = new Set(prev);

      if (next.has(gameId)) {
        next.delete(gameId);

        // clear buffers for that game (optional, but matches your prior “toggle off clears” behavior)
        setPlaysByGameId((p) => {
          const { [gameId]: _drop, ...rest } = p;
          return rest;
        });
        setAlertsByGameId((p) => {
          const { [gameId]: _drop, ...rest } = p;
          return rest;
        });

        if (socket != null) {
          // eslint-disable-next-line no-console
          console.log("[socket] leaveGame (toggle off)", gameId);
          socket.emit("leaveGame", gameId);
        }
      } else {
        next.add(gameId);

        if (socket != null) {
          // eslint-disable-next-line no-console
          console.log("[socket] joinGame (toggle on)", gameId);
          socket.emit("joinGame", gameId);
        }
      }

      return next;
    });
  };

  const isActive = (gameId: string): boolean => watchedRef.current.has(gameId);

  // The feed should show the SELECTED tile, not “last toggled”
  const plays: readonly PlayUpdate[] = selectedGameId ? (playsByGameId[selectedGameId] ?? []) : [];
  const alerts: readonly GameAlert[] = selectedGameId ? (alertsByGameId[selectedGameId] ?? []) : [];

  const watchedList: readonly string[] = useMemo(
    () => Array.from(watchedGameIds),
    [watchedGameIds],
  );

  return {
    plays,
    alerts,
    isConnected,
    connectionError,
    watchedGameIds: watchedList,
    isActive,
    toggleGame,
  };
}