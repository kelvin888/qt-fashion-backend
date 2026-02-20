import { Response } from 'express';
import { randomUUID } from 'crypto';

export type RealtimeDomain = 'custom_request' | 'offer' | 'notification';

export interface RealtimeEventPayload {
  [key: string]: unknown;
}

export interface RealtimeEvent {
  type: string;
  domain: RealtimeDomain;
  action: string;
  entityId?: string;
  actorUserId?: string;
  recipientUserId: string;
  createdAt: string;
  payload?: RealtimeEventPayload;
}

interface SseClient {
  clientId: string;
  userId: string;
  response: Response;
  heartbeatTimer: NodeJS.Timeout;
}

class RealtimeEventService {
  private readonly clientsByUser = new Map<string, Map<string, SseClient>>();
  private readonly heartbeatIntervalMs = 15000;

  subscribe(userId: string, response: Response): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');

    if (typeof response.flushHeaders === 'function') {
      response.flushHeaders();
    }

    const clientId = randomUUID();
    const heartbeatTimer = setInterval(() => {
      response.write(': ping\n\n');
    }, this.heartbeatIntervalMs);

    const userClients = this.clientsByUser.get(userId) ?? new Map<string, SseClient>();
    userClients.set(clientId, {
      clientId,
      userId,
      response,
      heartbeatTimer,
    });
    this.clientsByUser.set(userId, userClients);

    console.log(
      `[Realtime] Client connected - userId: ${userId}, clientId: ${clientId}, totalClients: ${userClients.size}`
    );

    response.write('retry: 5000\n\n');
    this.writeEvent(response, {
      type: 'REALTIME_CONNECTED',
      domain: 'notification',
      action: 'connected',
      recipientUserId: userId,
      createdAt: new Date().toISOString(),
      payload: {
        clientId,
      },
    });

    response.on('close', () => {
      this.unsubscribe(userId, clientId);
    });
  }

  publishToUser(userId: string, event: Omit<RealtimeEvent, 'recipientUserId' | 'createdAt'>): void {
    const clients = this.clientsByUser.get(userId);

    console.log(`[Realtime] Publishing to user ${userId}:`, {
      domain: event.domain,
      action: event.action,
      connectedClients: clients?.size || 0,
    });

    if (!clients || clients.size === 0) {
      console.warn(`[Realtime] No connected clients for user ${userId}, event not delivered`);
      return;
    }

    const fullEvent: RealtimeEvent = {
      ...event,
      recipientUserId: userId,
      createdAt: new Date().toISOString(),
    };

    clients.forEach((client) => {
      this.writeEvent(client.response, fullEvent);
    });

    console.log(`[Realtime] Event delivered to ${clients.size} client(s) for user ${userId}`);
  }

  publishToUsers(
    userIds: string[],
    event: Omit<RealtimeEvent, 'recipientUserId' | 'createdAt'>
  ): void {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    console.log(
      `[Realtime] Publishing to multiple users - Domain: ${event.domain}, Action: ${event.action}, User IDs: [${uniqueUserIds.join(', ')}]`
    );

    uniqueUserIds.forEach((userId) => {
      this.publishToUser(userId, event);
    });
  }

  private unsubscribe(userId: string, clientId: string): void {
    const userClients = this.clientsByUser.get(userId);
    if (!userClients) {
      return;
    }

    const client = userClients.get(clientId);
    if (client) {
      clearInterval(client.heartbeatTimer);
    }

    userClients.delete(clientId);

    console.log(
      `[Realtime] Client disconnected - userId: ${userId}, clientId: ${clientId}, remainingClients: ${userClients.size}`
    );

    if (userClients.size === 0) {
      this.clientsByUser.delete(userId);
      console.log(`[Realtime] All clients disconnected for user ${userId}`);
      return;
    }

    this.clientsByUser.set(userId, userClients);
  }

  private writeEvent(response: Response, event: RealtimeEvent): void {
    const eventId = randomUUID();
    response.write(`id: ${eventId}\n`);
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

export const realtimeEventService = new RealtimeEventService();
