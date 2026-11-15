import { Expose, Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { registerAs } from '@nestjs/config';
import {
  EnvHostname,
  EnvNonEmptyText,
  EnvPort,
  EnvPostgresUrl,
  EnvSecret,
  GrpcUrlConstraint,
  parseEnvText,
} from '../validation/env-constraints';
import { validateEnv } from '../validation/validate-env';
import { loadEnvFile } from './load-env-file';
import { NodeEnvironment, type NodeEnvName } from './node-environment';

export const OPERATIONS_DATABASE_NAME = 'memora';

export const OPERATIONS_OWNED_SCHEMAS = [
  'personalization',
  'production',
  'fulfillment',
  'after_sales',
] as const;

export type OperationsOwnedSchema = (typeof OPERATIONS_OWNED_SCHEMAS)[number];

export const OPERATIONS_FORBIDDEN_SCHEMAS = [
  'iam',
  'catalog',
  'pricing',
  'inventory',
  'design',
  'ordering',
  'memory',
  'platform',
] as const;

const POSTGRES_SUPERUSER_ROLES = new Set(['postgres']);

const DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const MQTT_URL_PATTERN = /^mqtts?:\/\/[^\s/]+(:\d+)?\/?$/i;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

/** Capture, MQTT and object-storage settings are mandatory everywhere except development. */
const requiredOutsideDevelopment = (env: { NODE_ENV?: unknown }): boolean =>
  env.NODE_ENV !== 'development';

/** Optional text: undefined or blank becomes undefined, otherwise trimmed. */
function optionalText(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return value;
}

function parseEnvNumber(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value.trim());
  }
  return value;
}

function parseDeviceCodes(value: unknown): unknown {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value !== 'string') {
    return value;
  }
  return value
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code !== '');
}

/** Validate when set; when unset only outside development. */
const presentOrRequired =
  (key: string) =>
  (env: Record<string, unknown>): boolean =>
    requiredOutsideDevelopment(env) || env[key] !== undefined;

export class OperationsEnvironment extends NodeEnvironment {
  @Expose()
  @EnvHostname()
  OPERATIONS_GRPC_HOST!: string;

  @Expose()
  @EnvPort()
  OPERATIONS_GRPC_PORT!: number;

  @Expose()
  @EnvHostname()
  OPERATIONS_HEALTH_HOST!: string;

  @Expose()
  @EnvPort()
  OPERATIONS_HEALTH_PORT!: number;

  @Expose()
  @EnvPostgresUrl()
  OPERATIONS_DATABASE_URL!: string;

  @Expose()
  @EnvSecret(32)
  OPERATIONS_INTERNAL_GRPC_SECRET!: string;

  // Operations -> Commerce target (host:port) and the secret Commerce's guard checks.
  // Consent reads order facts from Commerce, so both are required.
  @Expose()
  @Transform(({ value }: { value: unknown }) => parseEnvText(value))
  @Validate(GrpcUrlConstraint)
  COMMERCE_GRPC_URL!: string;

  @Expose()
  @EnvSecret(32)
  COMMERCE_INTERNAL_GRPC_SECRET!: string;

  // Consent policy version the FE must echo (PERSO-001). Default `dev-1` in development only.
  @Expose()
  @EnvNonEmptyText(50)
  OPERATIONS_CONSENT_POLICY_VERSION!: string;

  // Fingerprint capture (PERSO-005..008, D-P-10).
  @Expose()
  @Transform(({ value }: { value: unknown }) => parseEnvNumber(value))
  @IsInt()
  @Min(60)
  @Max(3600)
  OPERATIONS_CAPTURE_SESSION_TTL_SECONDS!: number;

  // No production default: startup fails when unset outside development.
  @Expose()
  @Transform(({ value }: { value: unknown }) => parseEnvNumber(value))
  @IsNumber()
  @Min(0)
  @Max(1000)
  OPERATIONS_CAPTURE_QUALITY_THRESHOLD!: number;

  // Registered device codes. Empty means no device is allowed.
  @Expose()
  @Transform(({ value }: { value: unknown }) => parseDeviceCodes(value))
  @IsArray()
  @Matches(DEVICE_CODE_PATTERN, { each: true })
  OPERATIONS_CAPTURE_DEVICE_CODES!: string[];

  // MQTT broker (device channel). Optional in development: unset disables MQTT.
  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_MQTT_URL'))
  @IsString()
  @Matches(MQTT_URL_PATTERN, { message: 'must be an mqtt:// or mqtts:// URL' })
  OPERATIONS_MQTT_URL?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_MQTT_USERNAME'))
  @IsString()
  @MinLength(1)
  OPERATIONS_MQTT_USERNAME?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_MQTT_PASSWORD'))
  @IsString()
  @MinLength(16)
  OPERATIONS_MQTT_PASSWORD?: string;

  // Object storage (Garage S3, D-P-08). Optional in development.
  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_OBJECT_STORAGE_ENDPOINT'))
  @IsString()
  @Matches(HTTP_URL_PATTERN, { message: 'must be an absolute http(s) URL' })
  OPERATIONS_OBJECT_STORAGE_ENDPOINT?: string;

  // Optional host used only to sign browser-reachable GET URLs (PERSO-026).
  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(HTTP_URL_PATTERN, { message: 'must be an absolute http(s) URL' })
  OPERATIONS_OBJECT_STORAGE_PUBLIC_ENDPOINT?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_OBJECT_STORAGE_REGION'))
  @IsString()
  @MinLength(1)
  OPERATIONS_OBJECT_STORAGE_REGION?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_OBJECT_STORAGE_BUCKET'))
  @IsString()
  @MinLength(1)
  OPERATIONS_OBJECT_STORAGE_BUCKET?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID'))
  @IsString()
  @MinLength(1)
  OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY'))
  @IsString()
  @MinLength(1)
  OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY?: string;
}

export interface OperationsEnv {
  NODE_ENV: NodeEnvName;
  OPERATIONS_GRPC_HOST: string;
  OPERATIONS_GRPC_PORT: number;
  OPERATIONS_HEALTH_HOST: string;
  OPERATIONS_HEALTH_PORT: number;
  OPERATIONS_DATABASE_URL: string;
  OPERATIONS_INTERNAL_GRPC_SECRET: string;
  COMMERCE_GRPC_URL: string;
  COMMERCE_INTERNAL_GRPC_SECRET: string;
  OPERATIONS_CONSENT_POLICY_VERSION: string;
  OPERATIONS_CAPTURE_SESSION_TTL_SECONDS: number;
  OPERATIONS_CAPTURE_QUALITY_THRESHOLD: number;
  OPERATIONS_CAPTURE_DEVICE_CODES: string[];
  OPERATIONS_MQTT_URL: string | undefined;
  OPERATIONS_MQTT_USERNAME: string | undefined;
  OPERATIONS_MQTT_PASSWORD: string | undefined;
  OPERATIONS_OBJECT_STORAGE_ENDPOINT: string | undefined;
  OPERATIONS_OBJECT_STORAGE_PUBLIC_ENDPOINT: string | undefined;
  OPERATIONS_OBJECT_STORAGE_REGION: string | undefined;
  OPERATIONS_OBJECT_STORAGE_BUCKET: string | undefined;
  OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID: string | undefined;
  OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY: string | undefined;
}

export function validateOperationsEnv(
  source: NodeJS.ProcessEnv | Record<string, unknown>,
): OperationsEnv {
  const validated = validateEnv(OperationsEnvironment, {
    ...source,
    OPERATIONS_GRPC_HOST: defaultText(source.OPERATIONS_GRPC_HOST, '0.0.0.0'),
    OPERATIONS_GRPC_PORT: defaultText(source.OPERATIONS_GRPC_PORT, '50053'),
    OPERATIONS_HEALTH_HOST: defaultText(
      source.OPERATIONS_HEALTH_HOST,
      '127.0.0.1',
    ),
    OPERATIONS_HEALTH_PORT: defaultText(source.OPERATIONS_HEALTH_PORT, '5053'),
    OPERATIONS_CONSENT_POLICY_VERSION:
      source.NODE_ENV === 'development'
        ? defaultText(source.OPERATIONS_CONSENT_POLICY_VERSION, 'dev-1')
        : source.OPERATIONS_CONSENT_POLICY_VERSION,
    OPERATIONS_CAPTURE_SESSION_TTL_SECONDS: defaultText(
      source.OPERATIONS_CAPTURE_SESSION_TTL_SECONDS,
      '900',
    ),
    OPERATIONS_CAPTURE_QUALITY_THRESHOLD:
      source.NODE_ENV === 'development'
        ? defaultText(source.OPERATIONS_CAPTURE_QUALITY_THRESHOLD, '50')
        : source.OPERATIONS_CAPTURE_QUALITY_THRESHOLD,
  });
  assertMqttCredentialsTogether(validated);
  assertOperationsDatabaseUrl(
    validated.OPERATIONS_DATABASE_URL,
    validated.NODE_ENV,
  );
  return {
    NODE_ENV: validated.NODE_ENV,
    OPERATIONS_GRPC_HOST: validated.OPERATIONS_GRPC_HOST,
    OPERATIONS_GRPC_PORT: validated.OPERATIONS_GRPC_PORT,
    OPERATIONS_HEALTH_HOST: validated.OPERATIONS_HEALTH_HOST,
    OPERATIONS_HEALTH_PORT: validated.OPERATIONS_HEALTH_PORT,
    OPERATIONS_DATABASE_URL: validated.OPERATIONS_DATABASE_URL,
    OPERATIONS_INTERNAL_GRPC_SECRET: validated.OPERATIONS_INTERNAL_GRPC_SECRET,
    COMMERCE_GRPC_URL: validated.COMMERCE_GRPC_URL,
    COMMERCE_INTERNAL_GRPC_SECRET: validated.COMMERCE_INTERNAL_GRPC_SECRET,
    OPERATIONS_CONSENT_POLICY_VERSION:
      validated.OPERATIONS_CONSENT_POLICY_VERSION,
    OPERATIONS_CAPTURE_SESSION_TTL_SECONDS:
      validated.OPERATIONS_CAPTURE_SESSION_TTL_SECONDS,
    OPERATIONS_CAPTURE_QUALITY_THRESHOLD:
      validated.OPERATIONS_CAPTURE_QUALITY_THRESHOLD,
    OPERATIONS_CAPTURE_DEVICE_CODES: validated.OPERATIONS_CAPTURE_DEVICE_CODES,
    OPERATIONS_MQTT_URL: validated.OPERATIONS_MQTT_URL,
    OPERATIONS_MQTT_USERNAME: validated.OPERATIONS_MQTT_USERNAME,
    OPERATIONS_MQTT_PASSWORD: validated.OPERATIONS_MQTT_PASSWORD,
    OPERATIONS_OBJECT_STORAGE_ENDPOINT:
      validated.OPERATIONS_OBJECT_STORAGE_ENDPOINT,
    OPERATIONS_OBJECT_STORAGE_PUBLIC_ENDPOINT:
      validated.OPERATIONS_OBJECT_STORAGE_PUBLIC_ENDPOINT,
    OPERATIONS_OBJECT_STORAGE_REGION:
      validated.OPERATIONS_OBJECT_STORAGE_REGION,
    OPERATIONS_OBJECT_STORAGE_BUCKET:
      validated.OPERATIONS_OBJECT_STORAGE_BUCKET,
    OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID:
      validated.OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID,
    OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY:
      validated.OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY,
  };
}

/** In development MQTT is all-or-nothing, so a half-set broker config is not silently ignored. */
function assertMqttCredentialsTogether(env: OperationsEnvironment): void {
  const present = [
    env.OPERATIONS_MQTT_URL,
    env.OPERATIONS_MQTT_USERNAME,
    env.OPERATIONS_MQTT_PASSWORD,
  ].filter((value) => value !== undefined).length;
  if (present !== 0 && present !== 3) {
    throw new Error(
      'Environment validation failed: OPERATIONS_MQTT_URL, OPERATIONS_MQTT_USERNAME and OPERATIONS_MQTT_PASSWORD must be set together',
    );
  }
}

export function loadOperationsRuntimeConfig(): OperationsEnv {
  loadEnvFile();
  return validateOperationsEnv(process.env);
}

export const operationsConfig = registerAs('operations', () => {
  const env = validateOperationsEnv(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    grpcHost: env.OPERATIONS_GRPC_HOST,
    grpcPort: env.OPERATIONS_GRPC_PORT,
    healthHost: env.OPERATIONS_HEALTH_HOST,
    healthPort: env.OPERATIONS_HEALTH_PORT,
    databaseUrl: env.OPERATIONS_DATABASE_URL,
    internalGrpcSecret: env.OPERATIONS_INTERNAL_GRPC_SECRET,
    commerceGrpcUrl: env.COMMERCE_GRPC_URL,
    commerceInternalGrpcSecret: env.COMMERCE_INTERNAL_GRPC_SECRET,
    consentPolicyVersion: env.OPERATIONS_CONSENT_POLICY_VERSION,
    captureSessionTtlSeconds: env.OPERATIONS_CAPTURE_SESSION_TTL_SECONDS,
    captureQualityThreshold: env.OPERATIONS_CAPTURE_QUALITY_THRESHOLD,
    captureDeviceCodes: env.OPERATIONS_CAPTURE_DEVICE_CODES,
    mqttUrl: env.OPERATIONS_MQTT_URL,
    mqttUsername: env.OPERATIONS_MQTT_USERNAME,
    mqttPassword: env.OPERATIONS_MQTT_PASSWORD,
    objectStorageEndpoint: env.OPERATIONS_OBJECT_STORAGE_ENDPOINT,
    objectStoragePublicEndpoint: env.OPERATIONS_OBJECT_STORAGE_PUBLIC_ENDPOINT,
    objectStorageRegion: env.OPERATIONS_OBJECT_STORAGE_REGION,
    objectStorageBucket: env.OPERATIONS_OBJECT_STORAGE_BUCKET,
    objectStorageAccessKeyId: env.OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID,
    objectStorageSecretAccessKey:
      env.OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY,
  };
});

export function toOperationsPoolConnectionString(url: string): string {
  const parsed = parseOperationsDatabaseUrl(url);
  parsed.searchParams.delete('schema');
  return parsed.toString();
}

export function assertOperationsDatabaseUrl(
  url: string,
  nodeEnv: NodeEnvName,
): void {
  const parsed = parseOperationsDatabaseUrl(url);
  const database = decodeURIComponent(
    parsed.pathname.replace(/^\/+|\/+$/g, ''),
  );
  if (database !== OPERATIONS_DATABASE_NAME) {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: must use database memora',
    );
  }

  const username = decodeURIComponent(parsed.username);
  if (username.trim() === '') {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: must include a database user',
    );
  }
  if (
    nodeEnv === 'production' &&
    POSTGRES_SUPERUSER_ROLES.has(username.toLowerCase())
  ) {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: production runtime must not use the PostgreSQL superuser',
    );
  }

  const schema = parsed.searchParams.get('schema');
  if (
    schema !== null &&
    !OPERATIONS_OWNED_SCHEMAS.includes(schema as OperationsOwnedSchema)
  ) {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: schema must be an Operations schema',
    );
  }

  const optionTokens = (parsed.searchParams.get('options') ?? '')
    .split(/[^a-z0-9_]+/i)
    .filter((token) => token !== '');
  if (
    optionTokens.some((token) =>
      OPERATIONS_FORBIDDEN_SCHEMAS.includes(
        token as (typeof OPERATIONS_FORBIDDEN_SCHEMAS)[number],
      ),
    )
  ) {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: must not set a non-Operations search_path',
    );
  }
}

function parseOperationsDatabaseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: must be a PostgreSQL connection URL',
    );
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      'Environment validation failed: OPERATIONS_DATABASE_URL: must be a PostgreSQL connection URL',
    );
  }
  return parsed;
}

function defaultText(value: unknown, fallback: string): unknown {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
}
