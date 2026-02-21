/**
 * Admin Events Service
 * Manages Server-Sent Events (SSE) for real-time admin updates
 */

import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AdminEvent,
  AdminEventType,
  SSEClient,
  NewOrderEvent,
  OrderUpdatedEvent,
  NewUserEvent,
  UserUpdatedEvent,
  StatsUpdatedEvent,
  SystemAlertEvent,
} from '../types/admin-events.types';

class AdminEventsService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new SSE client connection
   */
  addClient(res: Response, adminId: string): string {
    const clientId = uuidv4();

    const client: SSEClient = {
      id: clientId,
      adminId,
      response: res,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    console.log(
      `✅ Admin SSE client connected: ${adminId} (${clientId}). Total: ${this.clients.size}`
    );

    // Send initial connection event
    this.sendToClient(clientId, {
      id: uuidv4(),
      type: AdminEventType.SYSTEM_ALERT,
      timestamp: new Date().toISOString(),
      data: {
        level: 'info',
        message: 'Connected to real-time updates',
      },
    } as SystemAlertEvent);

    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`🔌 Admin SSE client disconnected: ${client.adminId} (${clientId})`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Get active clients count
   */
  getActiveClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Send event to specific client
   */
  private sendToClient(clientId: string, event: AdminEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const data = JSON.stringify(event);
      client.response.write(`id: ${event.id}\n`);
      client.response.write(`event: ${event.type}\n`);
      client.response.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error(`Error sending event to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  private broadcast(event: AdminEvent): void {
    const clientIds = Array.from(this.clients.keys());
    clientIds.forEach((clientId) => {
      this.sendToClient(clientId, event);
    });
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const event: AdminEvent = {
        id: uuidv4(),
        type: AdminEventType.HEARTBEAT,
        timestamp: new Date().toISOString(),
        data: {
          serverTime: new Date().toISOString(),
        },
      };

      this.broadcast(event);
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ============================================
  // EVENT EMISSION METHODS
  // ============================================

  /**
   * Emit new order event
   */
  emitNewOrder(data: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    designerName: string;
    amount: number;
  }): void {
    const event: NewOrderEvent = {
      id: uuidv4(),
      type: AdminEventType.NEW_ORDER,
      timestamp: new Date().toISOString(),
      data,
    };

    this.broadcast(event);
    console.log(`📦 New order event emitted: ${data.orderNumber}`);
  }

  /**
   * Emit order updated event
   */
  emitOrderUpdated(data: {
    orderId: string;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
  }): void {
    const event: OrderUpdatedEvent = {
      id: uuidv4(),
      type: AdminEventType.ORDER_UPDATED,
      timestamp: new Date().toISOString(),
      data,
    };

    this.broadcast(event);
    console.log(
      `📝 Order updated event emitted: ${data.orderNumber} (${data.oldStatus} → ${data.newStatus})`
    );
  }

  /**
   * Emit new user event
   */
  emitNewUser(data: { userId: string; email: string; fullName: string; role: string }): void {
    const event: NewUserEvent = {
      id: uuidv4(),
      type: AdminEventType.NEW_USER,
      timestamp: new Date().toISOString(),
      data,
    };

    this.broadcast(event);
    console.log(`👤 New user event emitted: ${data.email} (${data.role})`);
  }

  /**
   * Emit user updated event
   */
  emitUserUpdated(data: {
    userId: string;
    email: string;
    field: string;
    oldValue: any;
    newValue: any;
  }): void {
    const event: UserUpdatedEvent = {
      id: uuidv4(),
      type: AdminEventType.USER_UPDATED,
      timestamp: new Date().toISOString(),
      data,
    };

    this.broadcast(event);
    console.log(`👤 User updated event emitted: ${data.email}`);
  }

  /**
   * Emit stats updated event
   */
  emitStatsUpdated(reason: string): void {
    const event: StatsUpdatedEvent = {
      id: uuidv4(),
      type: AdminEventType.STATS_UPDATED,
      timestamp: new Date().toISOString(),
      data: { reason },
    };

    this.broadcast(event);
  }

  /**
   * Emit system alert
   */
  emitSystemAlert(level: 'info' | 'warning' | 'error', message: string, details?: any): void {
    const event: SystemAlertEvent = {
      id: uuidv4(),
      type: AdminEventType.SYSTEM_ALERT,
      timestamp: new Date().toISOString(),
      data: {
        level,
        message,
        details,
      },
    };

    this.broadcast(event);
    console.log(`🔔 System alert emitted: [${level.toUpperCase()}] ${message}`);
  }

  /**
   * Cleanup on service shutdown
   */
  shutdown(): void {
    this.stopHeartbeat();
    this.clients.clear();
    console.log('Admin Events Service shut down');
  }
}

// Export singleton instance
export default new AdminEventsService();
