// client/src/realtime/useRealtimeGame.ts
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  PlayUpdate,
  AlertUpdate,
  GameWireMessage,
  RealtimeState,
} from "./types";

export function useRealtimeGame(
  providerGameId: string | null,
): RealtimeState {
  const [plays, setPlays] = useState<readonly PlayUpdate[]>([]);
  const [alerts, setAlerts] = useState<readonly AlertUpdate[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // 1) Initialize socket once
  useEffect((): () => void => {
    const socket: Socket = io("http://localhost:3000/realtime", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] connected", socket.id);
    });

    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log("[socket] disconnected");
    });

    socket.onAny((event: string, ...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log("[socket] any event", event, args);
    });

    const handlePlay = (msg: GameWireMessage): void => {
      // eslint-disable-next-line no-console
      console.log("[socket] play event received", msg);

      // If it's an alert wrapper: { alert: { ... } }
      if ("alert" in msg && msg.alert != null) {
        const alert = msg.alert;
        setAlerts((prev: readonly AlertUpdate[]): readonly AlertUpdate[] => [
          ...prev,
          alert,
        ]);
        return;
      }

      // Otherwise assume it's a normal play update
      const update = msg as PlayUpdate;
      setPlays((prev: readonly PlayUpdate[]): readonly PlayUpdate[] => [
        ...prev,
        update,
      ]);
    };

    socket.on("play", handlePlay);

    return (): void => {
      socket.off("play", handlePlay);

      // avoid disconnecting a socket that never fully connected
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

  // 2) React to providerGameId changes (join room + reset state)
  useEffect(() => {
    const socket: Socket | null = socketRef.current;
    if (socket == null) {
      return;
    }

    if (providerGameId != null) {
      // eslint-disable-next-line no-console
      console.log("[socket] joinGame", providerGameId);
      socket.emit("joinGame", providerGameId);
      setPlays([]);
      setAlerts([]);
    }
  }, [providerGameId]);

  return { plays, alerts };
}