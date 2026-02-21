/**
 * Admin Events Types
 * Type definitions for Server-Sent Events (SSE)
 */

export enum AdminEventType {
  NEW_ORDER = 'new_order',
  ORDER_UPDATED = 'order_updated',
  NEW_USER = 'new_user',
  USER_UPDATED = 'user_updated',
  STATS_UPDATED = 'stats_updated',
  SYSTEM_ALERT = 'system_alert',
  HEARTBEAT = 'heartbeat',
}

export interface BaseAdminEvent {
  id: string;
  type: AdminEventType;
  timestamp: string;
}

export interface NewOrderEvent extends BaseAdminEvent {
  type: AdminEventType.NEW_ORDER;
  data: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    designerName: string;
    amount: number;
  };
}

export interface OrderUpdatedEvent extends BaseAdminEvent {
  type: AdminEventType.ORDER_UPDATED;
  data: {
    orderId: string;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
  };
}

export interface NewUserEvent extends BaseAdminEvent {
  type: AdminEventType.NEW_USER;
  data: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface UserUpdatedEvent extends BaseAdminEvent {
  type: AdminEventType.USER_UPDATED;
  data: {
    userId: string;
    email: string;
    field: string;
    oldValue: any;
    newValue: any;
  };
}

export interface StatsUpdatedEvent extends BaseAdminEvent {
  type: AdminEventType.STATS_UPDATED;
  data: {
    reason: string;
  };
}

export interface SystemAlertEvent extends BaseAdminEvent {
  type: AdminEventType.SYSTEM_ALERT;
  data: {
    level: 'info' | 'warning' | 'error';
    message: string;
    details?: any;
  };
}

export interface HeartbeatEvent extends BaseAdminEvent {
  type: AdminEventType.HEARTBEAT;
  data: {
    serverTime: string;
  };
}

export type AdminEvent =
  | NewOrderEvent
  | OrderUpdatedEvent
  | NewUserEvent
  | UserUpdatedEvent
  | StatsUpdatedEvent
  | SystemAlertEvent
  | HeartbeatEvent;

export interface SSEClient {
  id: string;
  adminId: string;
  response: any; // Express Response object
  connectedAt: Date;
}
