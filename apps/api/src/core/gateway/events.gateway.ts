import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface SocketJwtPayload {
  sub?: string;
  userId?: string;
  email?: string;
  role: 'EXECUTIVE' | 'ADMIN' | 'REGIONAL_MANAGER' | 'STORE_MANAGER';
  assignedRegionId?: string;
  assignedRegionIds?: string[];
  assignedStoreId?: string;
  assignedStoreIds?: string[];
}

@WebSocketGateway({
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authHeader = client.handshake.headers?.authorization;
      const bearerToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.split(' ')[1]
          : undefined;
      const token = client.handshake.auth?.token || bearerToken;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<SocketJwtPayload>(token);
      client.data.user = payload;

      // Join scoped rooms based on user role and store/region assignments
      if (['EXECUTIVE', 'ADMIN'].includes(payload.role)) {
        await client.join('enterprise');
      }

      if (payload.assignedRegionId) {
        await client.join(`region_${payload.assignedRegionId}`);
      }
      if (Array.isArray(payload.assignedRegionIds)) {
        for (const regionId of payload.assignedRegionIds) {
          await client.join(`region_${regionId}`);
        }
      }

      if (payload.assignedStoreId) {
        await client.join(`store_${payload.assignedStoreId}`);
      }
      if (Array.isArray(payload.assignedStoreIds)) {
        for (const storeId of payload.assignedStoreIds) {
          await client.join(`store_${storeId}`);
        }
      }

      const userId = payload.userId ?? payload.sub ?? 'unknown';
      this.logger.log(
        `Client connected: ${client.id} (User: ${userId}, Role: ${payload.role})`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid token';
      this.logger.warn(
        `Unauthorized WebSocket connection attempt: ${errorMessage}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('client_reconnected')
  handleClientReconnected(client: Socket): void {
    client.emit('sync_state_requested', {
      reconnectedAt: new Date().toISOString(),
    });
  }

  emitStockUpdated(
    storeId: string,
    productId: string,
    availableQuantity: number,
  ): void {
    if (!this.server) return;
    this.server.to(`store_${storeId}`).to('enterprise').emit('STOCK_UPDATED', {
      storeId,
      productId,
      availableQuantity,
      timestamp: new Date().toISOString(),
    });
  }

  emitRecCreated(recommendation: {
    id: string;
    recommendationNumber?: string;
    storeId?: string;
    store?: { regionId?: string };
    [key: string]: unknown;
  }): void {
    if (!this.server) return;
    const regionRoom = recommendation.store?.regionId
      ? `region_${recommendation.store.regionId}`
      : 'enterprise';
    const emitter = this.server.to(regionRoom).to('enterprise');
    if (recommendation.storeId) {
      emitter.to(`store_${recommendation.storeId}`);
    }
    emitter.emit('REC_CREATED', {
      recommendation,
      timestamp: new Date().toISOString(),
    });
  }

  emitRecUpdated(recommendation: {
    id: string;
    status: string;
    storeId?: string;
    store?: { regionId?: string };
  }): void {
    if (!this.server) return;
    this.server.emit('REC_UPDATED', {
      recommendationId: recommendation.id,
      status: recommendation.status,
      timestamp: new Date().toISOString(),
    });
  }
}
