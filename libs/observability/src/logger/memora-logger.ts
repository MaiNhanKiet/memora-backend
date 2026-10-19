import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import {
  getActorContext,
  getRequestId,
} from '../correlation/correlation-context';

export interface MemoraLoggerOptions {
  readonly service: string;
  readonly domain?: string;
  readonly nodeEnv: 'development' | 'production' | 'test';
}

export interface MemoraLogEvent {
  readonly message: string;
  readonly event: string;
  readonly domain?: string;
  readonly method?: string;
  readonly route?: string;
  readonly statusCode?: number;
  readonly durationMs?: number;
  readonly errorCode?: string;
  readonly actorId?: string;
  readonly actorType?: string;
  readonly customerIdentityId?: string;
}

const SENSITIVE_KEY =
  /(authorization|cookie|password|passwd|secret|token|jwt|otp|pin|credential|code[_-]?verifier|client[_-]?secret|refresh|id[_-]?token|access[_-]?token|biometric|email|request[_-]?body|response[_-]?body|^body$)/i;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LABELED_SECRET =
  /((?:password|passwd|otp|pin|secret|token|jwt|code[_-]?verifier|client[_-]?secret|authorization|cookie|email)\s*[=:]\s*)(["']?)[^\s"',}]+/gi;

export class MemoraLogger extends ConsoleLogger {
  private readonly serviceName: string;
  private readonly domainName: string;
  private readonly json: boolean;

  constructor(options: MemoraLoggerOptions) {
    const json = options.nodeEnv === 'production';
    super({
      json,
      colors: !json,
      prefix: options.service,
      logLevels: logLevelsFor(options.nodeEnv),
    });
    this.serviceName = options.service;
    this.domainName = options.domain ?? domainFromService(options.service);
    this.json = json;
  }

  protected stringifyMessage(message: unknown, logLevel: LogLevel): string {
    const safeMessage = redactValue(messageText(message));
    const formatted: unknown = super.stringifyMessage(safeMessage, logLevel);
    if (this.json) {
      return String(formatted);
    }
    const requestId = getRequestId();
    const prefix = requestId === undefined ? '' : `[requestId=${requestId}] `;
    return `${prefix}${String(formatted)}`;
  }

  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ) {
    const event = isLogEvent(message) ? message : undefined;
    const text = redactText(messageText(message));
    const base = super.getJsonLogObject(text, options);
    const requestId = getRequestId();
    const actor = getActorContext();
    const stack =
      typeof options.errorStack === 'string'
        ? redactText(options.errorStack)
        : undefined;

    const record = {
      level: options.logLevel,
      pid: base.pid,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      domain: event?.domain ?? this.domainName,
      event: event?.event ?? 'application.log',
      ...(requestId === undefined ? {} : { requestId }),
      actorId: event?.actorId ?? actor.actorId,
      actorType: event?.actorType ?? actor.actorType,
      ...(event?.customerIdentityId !== undefined ||
      actor.customerIdentityId !== undefined
        ? {
            customerIdentityId:
              event?.customerIdentityId ?? actor.customerIdentityId,
          }
        : {}),
      ...(event?.method === undefined ? {} : { method: event.method }),
      ...(event?.route === undefined ? {} : { route: event.route }),
      ...(event?.statusCode === undefined
        ? {}
        : { statusCode: event.statusCode }),
      message: text,
      ...(event?.durationMs === undefined
        ? {}
        : { durationMs: event.durationMs }),
      ...(event?.errorCode === undefined ? {} : { errorCode: event.errorCode }),
      ...(options.context.length > 0 ? { context: options.context } : {}),
      ...(stack === undefined ? {} : { stack }),
    };
    return record as unknown as {
      level: LogLevel;
      pid: number;
      timestamp: number;
      message: unknown;
      context?: string;
      stack?: unknown;
    };
  }

  protected stringifyReplacer(key: string, value: unknown): unknown {
    if (SENSITIVE_KEY.test(key)) {
      return '[REDACTED]';
    }
    if (typeof value === 'string') {
      return redactText(value);
    }
    return super.stringifyReplacer(key, value);
  }
}

export function createMemoraLogger(options: MemoraLoggerOptions): MemoraLogger {
  return new MemoraLogger(options);
}

function logLevelsFor(nodeEnv: MemoraLoggerOptions['nodeEnv']): LogLevel[] {
  if (nodeEnv === 'production') {
    return ['log', 'warn', 'error', 'fatal'];
  }
  return ['debug', 'log', 'verbose', 'warn', 'error', 'fatal'];
}

function messageText(message: unknown): string {
  if (isLogEvent(message)) {
    return message.message;
  }
  if (typeof message === 'string') {
    return message;
  }
  return JSON.stringify(redactValue(message)) ?? '';
}

function isLogEvent(value: unknown): value is MemoraLogEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.message === 'string' && typeof record.event === 'string';
}

export function redactText(value: string): string {
  return value
    .replace(JWT, '[REDACTED]')
    .replace(BEARER, 'Bearer [REDACTED]')
    .replace(EMAIL, '[REDACTED]')
    .replace(LABELED_SECRET, '$1$2[REDACTED]');
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (typeof value === 'object' && value !== null) {
    const redacted: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      redacted[key] = SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : redactValue(item);
    }
    return redacted;
  }
  return value;
}

function domainFromService(service: string): string {
  if (service === 'api-gateway') {
    return 'gateway';
  }
  return service.endsWith('-service')
    ? service.slice(0, -'-service'.length)
    : service;
}
