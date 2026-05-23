import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  PlayUpdate,
  GameAlert,
  RealtimeState,
  GameWirePayload,
  GameHydratePayload,
} from "./types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000/realtime";

// ---- singleton socket (prevents StrictMode connect/disconnect churn) ----
let singletonSocket: Socket | null = null;

function getSocket(): Socket {
  if (singletonSocket != null) return singletonSocket;

  singletonSocket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
  });

  return singletonSocket;
}

export type RealtimeGameControls = RealtimeState & {
  watchedGameIds: readonly string[];
  isActive: (gameId: string) => boolean;
  toggleGame: (gameId: string) => void;
};

function playIdentity(p: PlayUpdate): string {
  if (typeof p.playKey === "string" && p.playKey !== "") return p.playKey;

  return [
    p.providerGameId,
    p.inning,
    p.half,
    p.outs,
    p.balls,
    p.strikes,
    p.batterName ?? "",
    p.pitcherName ?? "",
    p.description ?? "",
    p.ts ?? "",
  ].join("|");
}

function dedupePlays(plays: readonly PlayUpdate[]): PlayUpdate[] {
  const seen = new Set<string>();
  const out: PlayUpdate[] = [];

  for (const play of plays) {
    const key = playIdentity(play);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(play);
  }

  return out;
}

type PlaysByGameId = Record<string, readonly PlayUpdate[]>;
type AlertsByGameId = Record<string, readonly GameAlert[]>;

export function useRealtimeGame(selectedGameId: string | null): RealtimeGameControls {
  const [playsByGameId, setPlaysByGameId] = useState<PlaysByGameId>({});
  const [alertsByGameId, setAlertsByGameId] = useState<AlertsByGameId>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // watched rooms (user toggles)
  const [watchedGameIds, setWatchedGameIds] = useState<Set<string>>(() => new Set());

  const socketRef = useRef<Socket | null>(null);
  const watchedRef = useRef<Set<string>>(new Set());

  // Track the selected game separately so right pane always works.
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    watchedRef.current = watchedGameIds;
  }, [watchedGameIds]);

  useEffect(() => {
    selectedRef.current = selectedGameId;
  }, [selectedGameId]);

  // Attach socket listeners once per hook instance (but socket itself is singleton)
  useEffect((): () => void => {
    const socket: Socket = getSocket();
    socketRef.current = socket;

    const onConnect = (): void => {
      setIsConnected(true);
      setConnectionError(null);

      // Re-join watched games
      for (const gid of watchedRef.current) {
        socket.emit("joinGame", gid);
      }

      // Also join the currently selected game (right pane)
      const sel: string | null = selectedRef.current;
      if (typeof sel === "string" && sel.trim() !== "") {
        socket.emit("joinGame", sel);
      }
    };

    const onDisconnect = (reason: string): void => {
      setIsConnected(false);
    };

    const onConnectError = (err: Error): void => {
      setIsConnected(false);
      setConnectionError(err.message);
    };

    const handlePlay = (msg: GameWirePayload): void => {
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
          return {
            ...prev,
            [gid]: dedupePlays([...cur, msg.play as PlayUpdate]),
          };
        });
      }
    };

    const handleHydrate = (msg: GameHydratePayload): void => {
      const gid: string | null = typeof msg?.gameId === "string" ? msg.gameId : null;
      if (gid == null || gid === "") return;

      const plays: readonly PlayUpdate[] = Array.isArray(msg.plays) ? msg.plays : [];

      setPlaysByGameId((prev) => ({
        ...prev,
        [gid]: dedupePlays(plays),
      }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("play", handlePlay);
    socket.on("hydrate", handleHydrate);

    // If the socket is already connected (singleton reused), sync state + join now.
    if (socket.connected) {
      onConnect();
    }

    return (): void => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("play", handlePlay);
      socket.off("hydrate", handleHydrate);

      // IMPORTANT: do NOT disconnect the singleton socket here.
      // StrictMode will unmount/remount in dev, and disconnecting kills in-flight handshakes.
      socketRef.current = null;
    };
  }, []);

  // Ensure the selected game is always joined while selected (right pane)
  useEffect(() => {
    const socket: Socket | null = socketRef.current;
    if (socket == null) return;

    const gid: string | null =
      typeof selectedGameId === "string" && selectedGameId.trim() !== "" ? selectedGameId : null;

    if (gid == null) return;

    socket.emit("joinGame", gid);

    return () => {
      // Leave selected game only if it is NOT being watched.
      // (So toggled games keep streaming even when unselected.)
      const stillWatched: boolean = watchedRef.current.has(gid);
      if (!stillWatched) {
        socket.emit("leaveGame", gid);
      }
    };
  }, [selectedGameId]);

  const toggleGame = (gameId: string): void => {
    const socket = socketRef.current;

    setWatchedGameIds((prev) => {
      const next = new Set(prev);

      if (next.has(gameId)) {
        next.delete(gameId);

        // clear buffers for that game (optional)
        setPlaysByGameId((p) => {
          const { [gameId]: _drop, ...rest } = p;
          return rest;
        });
        setAlertsByGameId((p) => {
          const { [gameId]: _drop, ...rest } = p;
          return rest;
        });

        // If it's also the currently selected game, don't leave here; selected-effect owns it.
        const isSelected: boolean = selectedRef.current === gameId;

        if (socket != null && !isSelected) {
          socket.emit("leaveGame", gameId);
        }
      } else {
        next.add(gameId);

        if (socket != null) {
          socket.emit("joinGame", gameId);
        }
      }

      return next;
    });
  };

  const isActive = (gameId: string): boolean => watchedRef.current.has(gameId);

  // The feed should show the SELECTED tile
  const plays: readonly PlayUpdate[] =
    selectedGameId ? (playsByGameId[selectedGameId] ?? []) : [];
  const alerts: readonly GameAlert[] =
    selectedGameId ? (alertsByGameId[selectedGameId] ?? []) : [];

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