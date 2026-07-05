import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityTrackingService } from './activity-tracking.service';

@Injectable()
export class ActivityTrackingInterceptor implements NestInterceptor {
  constructor(private readonly trackingService: ActivityTrackingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();

    // Fastify/Express request details
    const method = req.method;
    const url = req.url || '';
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isAuth = url.includes('/auth/');

    // We only track mutations (CUD) and auth endpoints (login, signup, logout)
    if (!isMutation && !isAuth) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        try {
          // Extract user/session details
          const user = req.user;
          let userUuid = user?.sub;
          let userEmail = user?.email;
          let userRole = user?.role || 'TENANT';

          if (!user) {
            userRole = 'GUEST';
          }

          // Determine application based on URL prefix or user role
          let app = 'upward-pay'; // Default to pay (tenant app)
          if (url.includes('/pm/') || url.includes('/landlord/') || userRole === 'PM') {
            app = 'upward-pm';
          }

          // Handle guest login/signup where req.user is not yet populated
          // but response contains user info
          if (responseBody && !user) {
            if (responseBody.user) {
              userUuid = responseBody.user.uuid;
              userEmail = responseBody.user.email;
              userRole = app === 'upward-pm' ? 'PM' : 'TENANT';
            }
          }

          // Determine Action
          let action = method;
          if (url.includes('login')) {
            action = 'LOGIN';
          } else if (url.includes('signup') || url.includes('complete-profile') || url.includes('/accept')) {
            action = 'SIGNUP';
          } else if (url.includes('logout')) {
            action = 'LOGOUT';
          } else {
            action = method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
          }

          // Extract Entity details and Description
          const parsedUrl = new URL(url, 'http://localhost');
          const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
          
          // Find the index of app context prefix (like pm or user)
          const appIndex = pathSegments.findIndex(s => s === 'pm' || s === 'user' || s === 'public');
          const cleanSegments = appIndex !== -1 ? pathSegments.slice(appIndex + 1) : pathSegments;

          let entityType = cleanSegments[0]?.toUpperCase() || 'UNKNOWN';
          // Singularize / Clean entity type
          if (entityType.endsWith('IES')) {
            entityType = entityType.replace(/IES$/, 'Y');
          } else if (entityType.endsWith('S') && !entityType.endsWith('SS')) {
            entityType = entityType.slice(0, -1);
          }

          // Extract EntityId from params or body or response body
          let entityId = req.params?.id || req.params?.uuid || req.params?.unitUuid || req.params?.propertyUuid || req.params?.paymentUuid;
          if (!entityId && cleanSegments[1]) {
            const secondSegment = cleanSegments[1];
            if (secondSegment.length > 5 || secondSegment.match(/^[0-9]+$/)) {
              entityId = secondSegment;
            }
          }
          if (!entityId && responseBody) {
            entityId = responseBody.uuid || responseBody.id?.toString();
          }

          const headerPlatform = req.headers['x-client-platform'];
          const rawUserAgent = req.headers['user-agent'] || '';
          const isCapacitor = headerPlatform === 'capacitor' || /capacitor/i.test(rawUserAgent);
          
          let userAgent = rawUserAgent;
          if (isCapacitor && !userAgent.toLowerCase().includes('capacitor')) {
            userAgent = userAgent ? `${userAgent} Capacitor` : 'Capacitor';
          }

          // Scrub sensitive metadata from request payload
          const metadata = this.scrubMetadata({
            body: req.body,
            query: req.query,
            params: req.params,
            clientPlatform: isCapacitor ? 'capacitor' : 'web',
          });

          const ipAddress = req.ip || req.raw?.ip;

          // Construct descriptive message
          let description = `${action} action on ${entityType}`;
          if (entityId) {
            description += ` (ID/UUID: ${entityId})`;
          }
          if (userEmail) {
            description += ` by ${userEmail}`;
          }

          if (url.includes('/units/bulk')) {
            const count = req.body?.units?.length || 0;
            description = `Property Manager bulk uploaded ${count} units`;
          } else if (url.includes('/import/bulk')) {
            const count = req.body?.rows?.length || 0;
            description = `Property Manager bulk imported ${count} properties/units`;
          } else if (url.includes('/records/bulk')) {
            const count = req.body?.records?.length || 0;
            description = `Property Manager bulk uploaded ${count} tenant records`;
          } else if (url.includes('/payments/bulk')) {
            const count = req.body?.rows?.length || 0;
            description = `Property Manager bulk added ${count} rent history payments`;
          } else if (action === 'LOGIN') {
            description = `User logged in: ${userEmail || 'unknown'}`;
            entityType = 'AUTH';
          } else if (action === 'SIGNUP') {
            if (app === 'upward-pm') {
              const bizName = req.body?.businessName ? ` (${req.body.businessName})` : '';
              description = `New Property Manager registered: ${userEmail || req.body?.email || 'unknown'}${bizName}`;
            } else {
              let details = '';
              if (req.body?.isFromInvite) {
                details = ' (Invited Tenant converted)';
              } else if (req.body?.isFromWaitlist) {
                details = ' (Waitlist converted)';
              } else {
                details = ' (Self Registered)';
              }
              description = `New user signed up: ${userEmail || req.body?.email || 'unknown'}${details}`;
            }
            entityType = 'AUTH';
          } else if (action === 'LOGOUT') {
            description = `User logged out: ${userEmail || 'unknown'}`;
            entityType = 'AUTH';
          }

          // Emit the tracking event
          this.trackingService.track({
            app,
            userUuid,
            userRole,
            userEmail,
            action,
            entityType,
            entityId,
            description,
            metadata,
            ipAddress,
            userAgent,
          });
        } catch (err) {
          // Fail silently so we don't disrupt the request lifecycle
          console.error('Error in ActivityTrackingInterceptor:', err);
        }
      }),
    );
  }

  private scrubMetadata(data: any): any {
    if (!data) return data;
    const sensitiveKeys = ['password', 'passwordPlain', 'current', 'new', 'otp', 'token', 'refreshToken', 'accessToken', 'secret'];
    const clone = JSON.parse(JSON.stringify(data));

    const walk = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          walk(obj[key]);
        }
      }
    };

    walk(clone);
    return clone;
  }
}
