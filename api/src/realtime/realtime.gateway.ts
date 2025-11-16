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


@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: "*",
    credentials: false,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  afterInit(): void {
    this.logger.log("✅ RealtimeGateway initialized");
  }

  handleConnection(client: Socket): void {
    this.logger.log(`client connected: ${client.id}`);
  }

  @SubscribeMessage("joinGame")
  public joinGame(
    @MessageBody() providerGameId: string,
    @ConnectedSocket() socket: Socket,
  ): void {
    if (!providerGameId) {
      this.logger.warn(`joinGame called with empty id from ${socket.id}`);
      return;
    }

    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.leave(room);
      }
    }

    socket.join(providerGameId);

    this.logger.log(
      `client ${socket.id} joined providerGameId room: ${providerGameId}`
    );
  }

  public publishGameUpdate(providerGameId: string, payload: unknown): void {
    this.server.to(providerGameId).emit("play", payload);
    this.logger.debug(
      `Emitted play update for ${providerGameId}`,
    );
  }
}
