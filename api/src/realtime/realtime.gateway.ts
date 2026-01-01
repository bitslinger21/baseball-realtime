// api/src/realtime/realtime.gateway.ts
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { GameAlert } from 'src/alerts/alerts.service';
import { PollerProducer } from '../poller/poller.producer';

// Minimal wire envelope type for clients
type GameWirePayload = {
  play?: Record<string, unknown>;
  alert?: GameAlert;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
    credentials: false,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger: Logger = new Logger(RealtimeGateway.name);

  // gameId -> set(socket.id)
  private readonly subscribersByGameId: Map<string, Set<string>> = new Map();

  // socket.id -> set(gameId)
  private readonly gamesBySocketId: Map<string, Set<string>> = new Map();

  public constructor(private readonly pollerProducer: PollerProducer) { }

  @WebSocketServer()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  private server!: Server;

  public afterInit(): void {
    this.logger.log('✅ RealtimeGateway initialized');
  }

  public handleConnection(client: Socket): void {
    this.logger.log(`client connected: ${client.id}`);
  }

  public handleDisconnect(client: Socket): void {
    this.logger.log(`client disconnected: ${client.id}`);

    const games: Set<string> | undefined = this.gamesBySocketId.get(client.id);
    if (games == null || games.size === 0) return;

    // Snapshot before we mutate maps
    const gameIds: readonly string[] = Array.from(games);

    for (const gameId of gameIds) {
      const remaining: number = this.removeSubscription(gameId, client.id);
      if (remaining === 0) {
        this.logger.log(`DISABLE game ${gameId} (no viewers)`);
        this.onDisableGame(gameId);
      }
    }
  }

  // --- Enable/Disable hooks (wired to PollerProducer) ---

  private onEnableGame(gameId: string): void {
    this.logger.log(`[realtime] ENABLE game ${gameId}`);

    // Must enable first (upsertGamePoll checks enabled set)
    this.pollerProducer.enableGame(gameId);

    void this.pollerProducer.upsertGamePoll(gameId, 'live').catch((e: unknown) => {
      const msg: string = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[realtime] failed to upsert poll for ${gameId}: ${msg}`);
    });
  }

  private onDisableGame(gameId: string): void {
    this.logger.log(`[realtime] DISABLE game ${gameId}`);

    void this.pollerProducer.removeGamePoll(gameId).catch((e: unknown) => {
      const msg: string = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[realtime] failed to remove poll for ${gameId}: ${msg}`);
    });

    this.pollerProducer.disableGame(gameId);
  }

  // --- Subscription tracking ---

  private addSubscription(gameId: string, socketId: string): number {
    const byGame: Set<string> =
      this.subscribersByGameId.get(gameId) ?? new Set<string>();
    byGame.add(socketId);
    this.subscribersByGameId.set(gameId, byGame);

    const bySocket: Set<string> =
      this.gamesBySocketId.get(socketId) ?? new Set<string>();
    bySocket.add(gameId);
    this.gamesBySocketId.set(socketId, bySocket);

    return byGame.size;
  }

  private removeSubscription(gameId: string, socketId: string): number {
    const byGame: Set<string> | undefined = this.subscribersByGameId.get(gameId);
    if (byGame != null) {
      byGame.delete(socketId);
      if (byGame.size === 0) {
        this.subscribersByGameId.delete(gameId);
      }
    }

    const bySocket: Set<string> | undefined = this.gamesBySocketId.get(socketId);
    if (bySocket != null) {
      bySocket.delete(gameId);
      if (bySocket.size === 0) {
        this.gamesBySocketId.delete(socketId);
      }
    }

    return byGame?.size ?? 0;
  }

  private parseProviderGameId(body: string | { gameId?: string }): string | null {
    const providerGameId: string | undefined =
      typeof body === 'string' ? body : body?.gameId;

    const id: string = String(providerGameId ?? '').trim();
    return id === '' ? null : id;
  }

  private leaveAllGameRooms(socket: Socket): void {
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
  }

  private clearTrackedSubscriptionsForSocket(socketId: string): readonly string[] {
    const prevGames: Set<string> | undefined = this.gamesBySocketId.get(socketId);
    if (prevGames == null || prevGames.size === 0) return [];

    // Snapshot before we mutate
    const gameIds: readonly string[] = Array.from(prevGames);
    this.logger.log(`[realtime] socket=${socketId} leaving games=${gameIds.join(",")}`);

    for (const gid of gameIds) {
      const remaining: number = this.removeSubscription(gid, socketId);
      if (remaining === 0) {
        this.logger.log(`DISABLE game ${gid} (no viewers)`);
        this.onDisableGame(gid);
      }
    }

    return gameIds;
  }

  private isSocketAlreadyOnlyInGame(socketId: string, gameId: string): boolean {
    const games: Set<string> | undefined = this.gamesBySocketId.get(socketId);
    if (games == null || games.size === 0) return false;
    return games.size === 1 && games.has(gameId);
  }

  // --- Socket messages ---

  @SubscribeMessage('joinGame')
  public joinGame(
    @MessageBody() body: string | { gameId?: string },
    @ConnectedSocket() socket: Socket,
  ): void {
    const providerGameId: string | null = this.parseProviderGameId(body);
    if (providerGameId == null) {
      this.logger.warn(`joinGame called with empty id from ${socket.id}`);
      return;
    }

    // ✅ Key fix:
    // If the socket is already subscribed ONLY to this same game,
    // don't clear subscriptions and don't disable/enable the poller.
    // This prevents "click Join again" from creating repeat jobs.
    if (this.isSocketAlreadyOnlyInGame(socket.id, providerGameId)) {
      // Still ensure the room membership is correct (cheap no-op if already joined)
      socket.join(providerGameId);
      this.logger.debug(`joinGame ignored (already joined): socket=${socket.id} game=${providerGameId}`);
      return;
    }

    // 1) Clear tracked subscriptions for this socket (maps)
    this.clearTrackedSubscriptionsForSocket(socket.id);

    // 2) Leave all previous rooms and join target room
    this.leaveAllGameRooms(socket);
    socket.join(providerGameId);

    // 3) Track subscription and enable on first viewer
    const count: number = this.addSubscription(providerGameId, socket.id);
    if (count === 1) {
      this.logger.log(`ENABLE game ${providerGameId} (first viewer)`);
      this.onEnableGame(providerGameId);
    }

    this.logger.log(`client ${socket.id} joined providerGameId room: ${providerGameId}`);
  }

  @SubscribeMessage('leaveGame')
  public leaveGame(
    @MessageBody() body: string | { gameId?: string },
    @ConnectedSocket() socket: Socket,
  ): void {
    const providerGameId: string | null = this.parseProviderGameId(body);
    if (providerGameId == null) {
      this.logger.warn(`leaveGame called with empty id from ${socket.id}`);
      return;
    }

    socket.leave(providerGameId);

    const remaining: number = this.removeSubscription(providerGameId, socket.id);

    this.logger.log(
      `client ${socket.id} left providerGameId room: ${providerGameId} (remaining=${remaining})`,
    );

    if (remaining === 0) {
      this.logger.log(`DISABLE game ${providerGameId} (no viewers)`);
      this.onDisableGame(providerGameId);
    }
  }

  // --- Publishing ---

  public publishGameUpdate(
    gameId: string,
    update: { play?: unknown; alert?: GameAlert },
  ): void {
    const payload: GameWirePayload =
      update.alert != null
        ? { alert: update.alert }
        : update.play != null
          ? { play: update.play as Record<string, unknown> }
          : {};

    this.server.to(gameId).emit('play', payload);

    this.logger.debug(
      `Emitted play update for ${gameId}: ${JSON.stringify(payload).slice(0, 200)}`,
    );
  }

  public publishGameAlert(
    gameId: string,
    payload: {
      kind: string;
      message: string;
      ts: string;
      gameId: string;
    },
  ): void {
    this.logger.debug(`[realtime] alert ${JSON.stringify(payload).slice(0, 200)}`);
    this.server.to(gameId).emit('alert', payload);
  }
}