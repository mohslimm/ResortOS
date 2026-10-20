import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'realtime',
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('RealtimeGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new Error('No token provided');

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      // Join tenant-specific room for isolation
      const tenantRoom = `tenant_${payload.tenantId}`;
      client.join(tenantRoom);

      this.logger.log(
        `Client ${client.id} authenticated and joined ${tenantRoom}`,
      );

      // Send initial welcome/status
      client.emit('connected', {
        status: 'authorized',
        tenantId: payload.tenantId,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Auth failed for client ${client.id}: ${errMsg}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcasts data to all clients in a specific tenant room.
   */
  broadcastToTenant(tenantId: string, event: string, payload: any) {
    const tenantRoom = `tenant_${tenantId}`;
    this.server.to(tenantRoom).emit(event, payload);
    this.logger.debug(`Broadcasted [${event}] to ${tenantRoom}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    return { event: 'pong', data: Date.now() };
  }
}
