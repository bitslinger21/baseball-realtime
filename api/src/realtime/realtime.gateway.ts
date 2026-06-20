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

import { GameAlert } from '../alerts/alerts.service';
import { PollerProducer } from '../poller/poller.producer';
import { LiveUpdate, PollerService } from '../poller/poller.service';
import { GameHydratePayload } from './realtime.types';
import { PlayUpdateWire } from '../poller/poller.processor';

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

  // dateKey -> set(socket.id)
  private readonly subscribersByDateKey: Map<string, Set<string>> = new Map();

  // socket.id -> set(dateKey)
  private readonly datesBySocketId: Map<string, Set<string>> = new Map();

  private parseDateKey(body: string | { dateKey?: string }): string | null {
    const raw: string | undefined = typeof body === 'string' ? body : body?.dateKey;
    const key: string = String(raw ?? '').trim();
    // minimal validation: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    return key;
  }

  private dailyRoom(dateKey: string): string {
    return `daily:${dateKey}`;
  }

  private addDateSubscription(dateKey: string, socketId: string): number {
    const byDate: Set<string> = this.subscribersByDateKey.get(dateKey) ?? new Set<string>();
    byDate.add(socketId);
    this.subscribersByDateKey.set(dateKey, byDate);

    const bySocket: Set<string> = this.datesBySocketId.get(socketId) ?? new Set<string>();
    bySocket.add(dateKey);
    this.datesBySocketId.set(socketId, bySocket);

    return byDate.size;
  }

  private removeDateSubscription(dateKey: string, socketId: string): number {
    const byDate: Set<string> | undefined = this.subscribersByDateKey.get(dateKey);
    if (byDate != null) {
      byDate.delete(socketId);
      if (byDate.size === 0) this.subscribersByDateKey.delete(dateKey);
    }

    const bySocket: Set<string> | undefined = this.datesBySocketId.get(socketId);
    if (bySocket != null) {
      bySocket.delete(dateKey);
      if (bySocket.size === 0) this.datesBySocketId.delete(socketId);
    }

    return byDate?.size ?? 0;
  }

  private clearTrackedDateSubscriptionsForSocket(socketId: string): readonly string[] {
    const prevDates: Set<string> | undefined = this.datesBySocketId.get(socketId);
    if (prevDates == null || prevDates.size === 0) return [];

    const dateKeys: readonly string[] = Array.from(prevDates);
    this.logger.log(`[realtime] socket=${socketId} leaving dates=${dateKeys.join(",")}`);

    for (const dateKey of dateKeys) {
      const remaining: number = this.removeDateSubscription(dateKey, socketId);
      if (remaining === 0) {
        this.logger.log(`DISABLE daily ${dateKey} (no viewers)`);
        this.onDisableDaily(dateKey);
      }
    }

    return dateKeys;
  }

  private toPlayWire(gameId: string, u: LiveUpdate): PlayUpdateWire {
    return {
      providerGameId: gameId,
      inning: u.inning,
      half: u.half === "Top" ? "top" : "bottom",
      outs: u.outs,
      balls: u.count.balls,
      strikes: u.count.strikes,
      bases: {
        on1: u.bases.on1 === true,
        on2: u.bases.on2 === true,
        on3: u.bases.on3 === true,
      },
      homeScore: u.homeScore ?? 0,
      awayScore: u.awayScore ?? 0,
      description: u.description ?? (u.playResult ?? ""),
      batterName: u.batterName ?? u.batter?.name,
      pitcherName: u.pitcherName ?? u.pitcher?.name,
      batterAvg: u.batterAvg,
      pitcherEra: u.pitcherEra,
      pitchType: u.pitchType,
      pitchTypeCode: u.pitchTypeCode,
      pitchSpeedMph: u.pitchSpeedMph,
      atBatIndex: u.atBatIndex,
      playResult: u.playResult,
      scorebookCode: u.scorebookCode,
      batterId: u.batterId != null ? Number(u.batterId) : undefined,
      pitchX: u.pitchX,
      pitchZ: u.pitchZ,
      strikeZoneTop: u.strikeZoneTop,
      strikeZoneBottom: u.strikeZoneBottom,
      batterGameAB: u.batterGameAB,
      batterGameH: u.batterGameH,
      batterGameR: u.batterGameR,
      batterGameRBI: u.batterGameRBI,
      ts: new Date().toISOString(),
      // playKey: u.playKey,
      homeTeamWinProbability: u.homeTeamWinProbability,
      leverageIndex: u.leverageIndex,
    };
  }

  public constructor(
    private readonly pollerProducer: PollerProducer,
    private readonly pollerService: PollerService,
  ) { }

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
    this.clearTrackedDateSubscriptionsForSocket(client.id);
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

  private onEnableDaily(dateKey: string): void {
    this.logger.log(`[realtime] ENABLE daily ${dateKey}`);

    this.pollerProducer.enableDaily(dateKey);

    void this.pollerProducer.upsertDailyPoll(dateKey).catch((e: unknown) => {
      const msg: string = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[realtime] failed to upsert daily poll for ${dateKey}: ${msg}`);
    });
  }

  private onDisableDaily(dateKey: string): void {
    this.logger.log(`[realtime] DISABLE daily ${dateKey}`);

    void this.pollerProducer.removeDailyPoll(dateKey).catch((e: unknown) => {
      const msg: string = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[realtime] failed to remove daily poll for ${dateKey}: ${msg}`);
    });

    this.pollerProducer.disableDaily(dateKey);
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

  @SubscribeMessage("joinGame")
  public async joinGame(
    @MessageBody() body: string | { gameId?: string },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    const providerGameId: string | null = this.parseProviderGameId(body);
    if (providerGameId == null) {
      this.logger.warn(`joinGame called with empty id from ${socket.id}`);
      return;
    }

    const games: Set<string> | undefined = this.gamesBySocketId.get(socket.id);
    const alreadySubscribed: boolean = games?.has(providerGameId) === true;

    if (!alreadySubscribed) {
      socket.join(providerGameId);

      const count: number = this.addSubscription(providerGameId, socket.id);
      if (count === 1) {
        this.logger.log(`ENABLE game ${providerGameId} (first viewer)`);
        this.onEnableGame(providerGameId);
      }

      this.logger.log(`client ${socket.id} joined providerGameId room: ${providerGameId}`);
    } else {
      socket.join(providerGameId);
    }

    try {
      const history: LiveUpdate[] = await this.pollerService.fetchHistory(providerGameId);

      const payload: GameHydratePayload = {
        gameId: providerGameId,
        plays: history.map((u) => this.toPlayWire(providerGameId, u)),
      };

      socket.emit("hydrate", payload);
    } catch (e: unknown) {
      const msg: string = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[realtime] hydrate failed for ${providerGameId}: ${msg}`);
    }
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

  @SubscribeMessage('joinDaily')
  public joinDaily(
    @MessageBody() body: string | { dateKey?: string },
    @ConnectedSocket() socket: Socket,
  ): void {
    const dateKey: string | null = this.parseDateKey(body);
    if (dateKey == null) {
      this.logger.warn(`joinDaily called with invalid dateKey from ${socket.id}`);
      return;
    }

    const room: string = this.dailyRoom(dateKey);
    socket.join(room);

    const count: number = this.addDateSubscription(dateKey, socket.id);
    if (count === 1) {
      this.logger.log(`ENABLE daily ${dateKey} (first viewer)`);
      this.onEnableDaily(dateKey);
    }

    this.logger.log(`client ${socket.id} joined daily room: ${room}`);
  }

  @SubscribeMessage('leaveDaily')
  public leaveDaily(
    @MessageBody() body: string | { dateKey?: string },
    @ConnectedSocket() socket: Socket,
  ): void {
    const dateKey: string | null = this.parseDateKey(body);
    if (dateKey == null) {
      this.logger.warn(`leaveDaily called with invalid dateKey from ${socket.id}`);
      return;
    }

    const room: string = this.dailyRoom(dateKey);
    socket.leave(room);

    const remaining: number = this.removeDateSubscription(dateKey, socket.id);

    this.logger.log(
      `client ${socket.id} left daily room: ${room} (remaining=${remaining})`,
    );

    if (remaining === 0) {
      this.logger.log(`DISABLE daily ${dateKey} (no viewers)`);
      this.onDisableDaily(dateKey);
    }
  }


  // --- Publishing ---

  public publishDailySnapshot(dateKey: string, snapshot: Record<string, unknown>): void {
    this.server.to(`daily:${dateKey}`).emit('daily', snapshot);
  }

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

  public publishDailyUpdate(dateKey: string, snapshot: Record<string, unknown>): void {
    const room: string = this.dailyRoom(dateKey);
    this.server.to(room).emit('daily', snapshot);
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