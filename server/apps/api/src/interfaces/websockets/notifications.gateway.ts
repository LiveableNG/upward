import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinPmRoom')
  handleJoinPmRoom(@MessageBody() data: { pmUuid: string }, @ConnectedSocket() client: Socket) {
    const room = `pm_${data.pmUuid}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joinedRoom', data: room };
  }

  @OnEvent('pm.bulk_dispatch.completed')
  handleBulkDispatchCompleted(payload: { pmUuid: string; successful: number; failed: number; total: number }) {
    const room = `pm_${payload.pmUuid}`;
    this.logger.log(`Emitting bulk dispatch completed to room ${room}`);
    this.server.to(room).emit('bulk_dispatch_completed', payload);
  }
}
