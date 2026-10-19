import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  runWithCorrelation,
  type CorrelationStore,
} from '../correlation/correlation-context';
import {
  readIncomingActor,
  readIncomingGrpcRequestId,
} from '../grpc/grpc-request-id';
import { getActorContext } from '../correlation/correlation-context';
import type { MemoraLogEvent } from '../logger/memora-logger';

type TransportName = 'http' | 'grpc';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const type = context.getType<string>();
    if (type === 'rpc') {
      const rpcContext: unknown = context.switchToRpc().getContext();
      const store: CorrelationStore = {
        requestId: readIncomingGrpcRequestId(rpcContext),
        actor: readIncomingActor(rpcContext),
      };
      return bindObservableToContext(store, this.trace(context, next, 'grpc'));
    }

    if (type === 'http') {
      return this.trace(context, next, 'http');
    }

    return next.handle();
  }

  private trace(
    context: ExecutionContext,
    next: CallHandler<unknown>,
    transport: TransportName,
  ): Observable<unknown> {
    const started = Date.now();
    const route = describeRoute(context, transport);

    return next.handle().pipe(
      tap(() => {
        this.write({
          transport,
          route,
          status: resolveSuccessStatus(context, transport),
          durationMs: Date.now() - started,
          outcome: 'success',
          errorKind: 'none',
        });
      }),
      catchError((error: unknown) => {
        const status = resolveErrorStatus(error, transport);
        this.write({
          transport,
          route,
          status,
          durationMs: Date.now() - started,
          outcome: 'failure',
          errorKind: resolveErrorKind(status),
          errorCode: readErrorCode(error, status, transport),
          stack: error instanceof Error ? error.stack : undefined,
        });
        return throwError(() => error);
      }),
    );
  }

  private write(entry: {
    transport: TransportName;
    route: string;
    status: number;
    durationMs: number;
    outcome: 'success' | 'failure';
    errorKind: 'none' | 'http' | 'dependency';
    errorCode?: string;
    stack?: string;
  }): void {
    if (isQuietHealthSuccess(entry.transport, entry.route, entry.outcome)) {
      return;
    }

    const actor = getActorContext();
    const kindPart = entry.outcome === 'failure' ? ` ${entry.errorKind}` : '';
    const described = splitRoute(entry.route);
    const payload: MemoraLogEvent = {
      message: `${entry.transport.toUpperCase()} ${entry.route} ${entry.status} ${entry.durationMs}ms ${entry.outcome}${kindPart}`,
      event: entry.transport === 'http' ? 'http.request' : 'grpc.request',
      method: described.method,
      route: described.route,
      statusCode: entry.status,
      durationMs: entry.durationMs,
      actorId: actor.actorId,
      actorType: actor.actorType,
      ...(actor.customerIdentityId === undefined
        ? {}
        : { customerIdentityId: actor.customerIdentityId }),
      ...(entry.errorCode === undefined ? {} : { errorCode: entry.errorCode }),
    };
    if (entry.outcome === 'success') {
      this.logger.log(payload);
      return;
    }
    if (isServerFailure(entry.transport, entry.status)) {
      this.logger.error(payload, entry.stack);
      return;
    }
    this.logger.warn(payload);
  }
}

export function isQuietHealthSuccess(
  transport: string,
  route: string,
  outcome: string,
): boolean {
  if (transport !== 'http' || outcome !== 'success') {
    return false;
  }
  const path = route.replace(/^[A-Z]+\s+/, '').split('?')[0] ?? '';
  return path === '/health/live' || path === '/health/ready';
}

function splitRoute(route: string): { method: string; route: string } {
  const space = route.indexOf(' ');
  if (space <= 0) {
    return { method: route, route };
  }
  return { method: route.slice(0, space), route: route.slice(space + 1) };
}

function bindObservableToContext<T>(
  store: CorrelationStore,
  source: Observable<T>,
): Observable<T> {
  return new Observable((subscriber) => {
    const subscription = runWithCorrelation(store, () =>
      source.subscribe({
        next: (value) => {
          runWithCorrelation(store, () => {
            subscriber.next(value);
          });
        },
        error: (err: unknown) => {
          runWithCorrelation(store, () => {
            subscriber.error(err);
          });
        },
        complete: () => {
          runWithCorrelation(store, () => {
            subscriber.complete();
          });
        },
      }),
    );
    return () => {
      subscription.unsubscribe();
    };
  });
}

function describeRoute(
  context: ExecutionContext,
  transport: TransportName,
): string {
  if (transport === 'http') {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const method = request.method ?? 'GET';
    const url = sanitizeHttpUrl(request.originalUrl ?? request.url ?? '');
    return `${method} ${url}`;
  }

  return `${context.getClass().name}.${context.getHandler().name}`;
}

const REDACTED_QUERY_KEYS = new Set([
  'code',
  'state',
  'id_token',
  'access_token',
  'refresh_token',
  'token',
  'otp',
  'password',
  'confirmationid',
  'code_verifier',
  'client_secret',
  'credential',
  'cookie',
]);

export function sanitizeHttpUrl(url: string): string {
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) {
    return url;
  }
  const path = url.slice(0, queryIndex);
  const search = url.slice(queryIndex + 1);
  const params = new URLSearchParams(search);
  for (const key of [...params.keys()]) {
    if (REDACTED_QUERY_KEYS.has(key.toLowerCase())) {
      params.set(key, '[REDACTED]');
    }
  }
  const next = params.toString();
  return next.length === 0 ? path : `${path}?${next}`;
}

function resolveSuccessStatus(
  context: ExecutionContext,
  transport: TransportName,
): number {
  if (transport === 'grpc') {
    return GrpcStatus.OK;
  }

  const httpCode: unknown = Reflect.getMetadata(
    HTTP_CODE_METADATA,
    context.getHandler(),
  );
  if (typeof httpCode === 'number') {
    return httpCode;
  }

  const response = context
    .switchToHttp()
    .getResponse<{ statusCode?: number }>();
  return response.statusCode ?? HttpStatus.OK;
}

function resolveErrorStatus(error: unknown, transport: TransportName): number {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  if (transport === 'grpc' && hasNumericCode(error)) {
    return error.code;
  }

  return transport === 'grpc'
    ? GrpcStatus.INTERNAL
    : HttpStatus.INTERNAL_SERVER_ERROR;
}

function resolveErrorKind(status: number): 'http' | 'dependency' {
  const httpDependency = new Set<number>([
    HttpStatus.BAD_GATEWAY,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
  ]);
  const grpcDependency = new Set<number>([
    GrpcStatus.UNAVAILABLE,
    GrpcStatus.DEADLINE_EXCEEDED,
  ]);
  if (httpDependency.has(status) || grpcDependency.has(status)) {
    return 'dependency';
  }
  return 'http';
}

const SERVER_GRPC_STATUSES = new Set<number>([
  GrpcStatus.UNKNOWN,
  GrpcStatus.INTERNAL,
  GrpcStatus.UNAVAILABLE,
  GrpcStatus.DATA_LOSS,
  GrpcStatus.DEADLINE_EXCEEDED,
]);

function isServerFailure(transport: TransportName, status: number): boolean {
  if (transport === 'http') {
    return status >= 500;
  }
  return SERVER_GRPC_STATUSES.has(status);
}

function readErrorCode(
  error: unknown,
  status: number,
  transport: TransportName,
): string | undefined {
  if (error instanceof HttpException) {
    const payload: unknown = error.getResponse();
    if (typeof payload === 'object' && payload !== null && 'code' in payload) {
      const code = payload.code;
      if (typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)) {
        return code;
      }
    }
  }

  if (transport === 'http') {
    return HTTP_ERROR_CODES[status] ?? 'INTERNAL_ERROR';
  }

  const name = GrpcStatus[status];
  return typeof name === 'string' ? name : 'UNKNOWN';
}

const HTTP_ERROR_CODES: Readonly<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  412: 'PRECONDITION_FAILED',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

function hasNumericCode(value: unknown): value is { code: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'number'
  );
}
