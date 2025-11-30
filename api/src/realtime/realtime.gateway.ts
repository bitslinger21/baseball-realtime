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
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { GameAlert } from 'src/alerts/alerts.service';

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
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  afterInit(): void {
    this.logger.log('✅ RealtimeGateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`client connected: ${client.id}`);
  }

  @SubscribeMessage('joinGame')
  public joinGame(
    @MessageBody() body: string | { gameId?: string },
    @ConnectedSocket() socket: Socket,
  ): void {
    // Allow both "joinGame('813038')" and "joinGame({ gameId: '813038' })"
    const providerGameId: string | undefined =
      typeof body === 'string' ? body : body?.gameId;

    if (!providerGameId) {
      this.logger.warn(`joinGame called with empty id from ${socket.id}`);
      return;
    }

    // Leave all previous game rooms (except the socket's own room)
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.leave(room);
      }
    }

    socket.join(providerGameId);

    this.logger.log(
      `client ${socket.id} joined providerGameId room: ${providerGameId}`,
    );
  }

  public publishGameUpdate(
    gameId: string,
    update: { play?: unknown; alert?: GameAlert },
  ): void {
    const payload =
      update.alert != null
        ? { alert: update.alert }
        : update.play != null
          ? { play: update.play }
          : {};

    this.server.to(gameId).emit('play', payload);

    this.logger.debug(
      `Emitted play update for ${gameId}: ${JSON.stringify(payload).slice(
        0,
        200,
      )}`,
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
    // Separate "alert" channel (if you choose to keep it)
    this.logger.debug(`[realtime] alert ${JSON.stringify(payload).slice(0, 200)}`);
    this.server.to(gameId).emit('alert', payload);
  }
}