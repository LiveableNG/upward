import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface AppActivityEvent {
  app: string;          // "upward-pay" or "upward-pm"
  userUuid?: string;    // UUID of the user/PM (from JWT sub)
  userRole: string;     // "TENANT", "PM", "ADMIN", "SYSTEM", "GUEST"
  userEmail?: string;
  action: string;       // "CREATE", "UPDATE", "DELETE", "LOGIN", etc.
  entityType?: string;  // e.g. "PROPERTY", "UNIT", "PAYMENT", "PROFILE"
  entityId?: string;    // ID/UUID of the entity
  description: string;  // Human-readable description
  metadata?: any;       // Additional info (body, query, params, etc.)
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityTrackingService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  track(event: AppActivityEvent) {
    this.eventEmitter.emit('app.activity', event);
  }
}
