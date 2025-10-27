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
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  path: '/socket.io',        // default path
  cors: { 
    origin: '*',  
    credentials: false 
  },     // allow Vite dev (http://localhost:5173)
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() server!: Server;

  afterInit() { this.logger.log('✅ Socket.IO ready'); }
  handleConnection(client: Socket) { this.logger.log(`client connected ${client.id}`); }

  // emit to room per gameId
  publishGameUpdate(gameId: string, payload: unknown) {
    this.server.to(`game:${gameId}`).emit('game:update', payload);
  }

  // @SubscribeMessage('join')
  // join(
  //   @MessageBody() { gameId }: { gameId: string },
  //   @ConnectedSocket() socket: Socket,
  // ) {
  //   const room = `game:${gameId}`;
    
  // }

  @SubscribeMessage('join')
  join(
    @MessageBody() { gameId }: { gameId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const room = `game:${gameId}`;
    socket.join(room);
    this.logger.log(`client ${socket.id} joined ${room}`);
    socket.emit('joined', { room, ok: true }); // optional ack
  }
}

