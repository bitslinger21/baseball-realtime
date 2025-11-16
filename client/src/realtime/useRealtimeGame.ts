import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { PlayUpdate } from "./types";

export function useRealtimeGame(
  providerGameId: string | null,
): readonly PlayUpdate[] {
  const [updates, setUpdates] = useState<readonly PlayUpdate[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // 1) Initialize socket once
  useEffect((): () => void => {
    // Connect directly to the NestJS backend, not Vite dev server
    const socket: Socket = io("http://localhost:3000/realtime", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // Basic logging
    socket.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] connected", socket.id);
    });

    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] disconnected");
    });

    // Handle incoming play events (we’ll send these in step 2.4)
    const handlePlay = (update: PlayUpdate): void => {
      setUpdates((prev: readonly PlayUpdate[]): readonly PlayUpdate[] => [
        ...prev,
        update,
      ]);
    };

    socket.on("play", handlePlay);

    // Cleanup
    return (): void => {
      socket.off("play", handlePlay);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // 2) React to providerGameId changes
  useEffect(() => {
    const socket: Socket | null = socketRef.current;
    if (socket == null) {
      return;
    }

    if (providerGameId != null) {
      // eslint-disable-next-line no-console
      console.log("[socket] joinGame", providerGameId);
      socket.emit("joinGame", providerGameId);

      // when switching games, reset the feed
      setUpdates([]);
    }
  }, [providerGameId]);

  return updates;
}