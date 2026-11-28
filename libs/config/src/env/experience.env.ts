import { Expose, Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { registerAs } from '@nestjs/config';
import {
  EnvHostname,
  EnvPort,
  EnvPostgresUrl,
  EnvSecret,
  GrpcUrlConstraint,
} from '../validation/env-constraints';
import { validateEnv } from '../validation/validate-env';
import { loadEnvFile } from './load-env-file';
import { NodeEnvironment, type NodeEnvName } from './node-environment';

export const EXPERIENCE_DATABASE_NAME = 'memora';

export const EXPERIENCE_OWNED_SCHEMAS = ['memory', 'platform'] as const;

export type ExperienceOwnedSchema = (typeof EXPERIENCE_OWNED_SCHEMAS)[number];

export const EXPERIENCE_FORBIDDEN_SCHEMAS = [
  'iam',
  'catalog',
  'pricing',
  'inventory',
  'design',
  'ordering',
  'personalization',
  'production',
  'fulfillment',
  'after_sales',
] as const;

const POSTGRES_SUPERUSER_ROLES = new Set(['postgres']);
const HTTP_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

const requiredOutsideDevelopment = (env: { NODE_ENV?: unknown }): boolean =>
  env.NODE_ENV !== 'development';

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

const presentOrRequired =
  (key: string) =>
  (env: Record<string, unknown>): boolean =>
    requiredOutsideDevelopment(env) || env[key] !== undefined;

export class ExperienceEnvironment extends NodeEnvironment {
  @Expose()
  @EnvHostname()
  EXPERIENCE_GRPC_HOST!: string;

  @Expose()
  @EnvPort()
  EXPERIENCE_GRPC_PORT!: number;

  @Expose()
  @EnvHostname()
  EXPERIENCE_HEALTH_HOST!: string;

  @Expose()
  @EnvPort()
  EXPERIENCE_HEALTH_PORT!: number;

  @Expose()
  @EnvPostgresUrl()
  EXPERIENCE_DATABASE_URL!: string;

  @Expose()
  @EnvSecret(32)
  EXPERIENCE_INTERNAL_GRPC_SECRET!: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @Validate(GrpcUrlConstraint)
  OPERATIONS_GRPC_URL?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @EnvSecret(32)
  OPERATIONS_INTERNAL_GRPC_SECRET?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @Validate(GrpcUrlConstraint)
  COMMERCE_GRPC_URL?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @EnvSecret(32)
  COMMERCE_INTERNAL_GRPC_SECRET?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('EXPERIENCE_OBJECT_STORAGE_ENDPOINT'))
  @IsString()
  @Matches(HTTP_URL_PATTERN, { message: 'must be an absolute http(s) URL' })
  EXPERIENCE_OBJECT_STORAGE_ENDPOINT?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(HTTP_URL_PATTERN, { message: 'must be an absolute http(s) URL' })
  EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('EXPERIENCE_OBJECT_STORAGE_REGION'))
  @IsString()
  @MinLength(1)
  EXPERIENCE_OBJECT_STORAGE_REGION?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('EXPERIENCE_OBJECT_STORAGE_BUCKET'))
  @IsString()
  @MinLength(1)
  EXPERIENCE_OBJECT_STORAGE_BUCKET?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID'))
  @IsString()
  @MinLength(1)
  EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID?: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @ValidateIf(presentOrRequired('EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY'))
  @IsString()
  @MinLength(1)
  EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY?: string;
}

export interface ExperienceEnv {
  NODE_ENV: NodeEnvName;
  EXPERIENCE_GRPC_HOST: string;
  EXPERIENCE_GRPC_PORT: number;
  EXPERIENCE_HEALTH_HOST: string;
  EXPERIENCE_HEALTH_PORT: number;
  EXPERIENCE_DATABASE_URL: string;
  EXPERIENCE_INTERNAL_GRPC_SECRET: string;
  OPERATIONS_GRPC_URL?: string;
  OPERATIONS_INTERNAL_GRPC_SECRET?: string;
  COMMERCE_GRPC_URL?: string;
  COMMERCE_INTERNAL_GRPC_SECRET?: string;
  EXPERIENCE_OBJECT_STORAGE_ENDPOINT?: string;
  EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT?: string;
  EXPERIENCE_OBJECT_STORAGE_REGION?: string;
  EXPERIENCE_OBJECT_STORAGE_BUCKET?: string;
  EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID?: string;
  EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY?: string;
}

export function validateExperienceEnv(
  source: NodeJS.ProcessEnv | Record<string, unknown>,
): ExperienceEnv {
  const validated = validateEnv(ExperienceEnvironment, {
    ...source,
    EXPERIENCE_GRPC_HOST: defaultText(source.EXPERIENCE_GRPC_HOST, '0.0.0.0'),
    EXPERIENCE_GRPC_PORT: defaultText(source.EXPERIENCE_GRPC_PORT, '50054'),
    EXPERIENCE_HEALTH_HOST: defaultText(
      source.EXPERIENCE_HEALTH_HOST,
      '127.0.0.1',
    ),
    EXPERIENCE_HEALTH_PORT: defaultText(source.EXPERIENCE_HEALTH_PORT, '5054'),
    EXPERIENCE_OBJECT_STORAGE_REGION: defaultText(
      source.EXPERIENCE_OBJECT_STORAGE_REGION,
      'garage',
    ),
    EXPERIENCE_OBJECT_STORAGE_BUCKET: defaultText(
      source.EXPERIENCE_OBJECT_STORAGE_BUCKET,
      'memora-memory',
    ),
  });
  if (
    (validated.OPERATIONS_GRPC_URL &&
      !validated.OPERATIONS_INTERNAL_GRPC_SECRET) ||
    (validated.COMMERCE_GRPC_URL && !validated.COMMERCE_INTERNAL_GRPC_SECRET)
  ) {
    throw new Error(
      'Configured Memory activation gRPC targets require their internal secrets',
    );
  }
  assertExperienceDatabaseUrl(
    validated.EXPERIENCE_DATABASE_URL,
    validated.NODE_ENV,
  );
  return {
    NODE_ENV: validated.NODE_ENV,
    EXPERIENCE_GRPC_HOST: validated.EXPERIENCE_GRPC_HOST,
    EXPERIENCE_GRPC_PORT: validated.EXPERIENCE_GRPC_PORT,
    EXPERIENCE_HEALTH_HOST: validated.EXPERIENCE_HEALTH_HOST,
    EXPERIENCE_HEALTH_PORT: validated.EXPERIENCE_HEALTH_PORT,
    EXPERIENCE_DATABASE_URL: validated.EXPERIENCE_DATABASE_URL,
    EXPERIENCE_INTERNAL_GRPC_SECRET: validated.EXPERIENCE_INTERNAL_GRPC_SECRET,
    OPERATIONS_GRPC_URL: validated.OPERATIONS_GRPC_URL,
    OPERATIONS_INTERNAL_GRPC_SECRET: validated.OPERATIONS_INTERNAL_GRPC_SECRET,
    COMMERCE_GRPC_URL: validated.COMMERCE_GRPC_URL,
    COMMERCE_INTERNAL_GRPC_SECRET: validated.COMMERCE_INTERNAL_GRPC_SECRET,
    EXPERIENCE_OBJECT_STORAGE_ENDPOINT:
      validated.EXPERIENCE_OBJECT_STORAGE_ENDPOINT,
    EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT:
      validated.EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT,
    EXPERIENCE_OBJECT_STORAGE_REGION:
      validated.EXPERIENCE_OBJECT_STORAGE_REGION,
    EXPERIENCE_OBJECT_STORAGE_BUCKET:
      validated.EXPERIENCE_OBJECT_STORAGE_BUCKET,
    EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID:
      validated.EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID,
    EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY:
      validated.EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
  };
}

export function loadExperienceRuntimeConfig(): ExperienceEnv {
  loadEnvFile();
  return validateExperienceEnv(process.env);
}

export const experienceConfig = registerAs('experience', () => {
  const env = validateExperienceEnv(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    grpcHost: env.EXPERIENCE_GRPC_HOST,
    grpcPort: env.EXPERIENCE_GRPC_PORT,
    healthHost: env.EXPERIENCE_HEALTH_HOST,
    healthPort: env.EXPERIENCE_HEALTH_PORT,
    databaseUrl: env.EXPERIENCE_DATABASE_URL,
    internalGrpcSecret: env.EXPERIENCE_INTERNAL_GRPC_SECRET,
    memoryActivation: {
      fulfillment:
        env.OPERATIONS_GRPC_URL && env.OPERATIONS_INTERNAL_GRPC_SECRET
          ? {
              url: env.OPERATIONS_GRPC_URL,
              secret: env.OPERATIONS_INTERNAL_GRPC_SECRET,
            }
          : undefined,
      ordering:
        env.COMMERCE_GRPC_URL && env.COMMERCE_INTERNAL_GRPC_SECRET
          ? {
              url: env.COMMERCE_GRPC_URL,
              secret: env.COMMERCE_INTERNAL_GRPC_SECRET,
            }
          : undefined,
    },
    storage: {
      endpoint: env.EXPERIENCE_OBJECT_STORAGE_ENDPOINT,
      publicEndpoint: env.EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT,
      region: env.EXPERIENCE_OBJECT_STORAGE_REGION ?? 'garage',
      bucket: env.EXPERIENCE_OBJECT_STORAGE_BUCKET ?? 'memora-memory',
      accessKeyId: env.EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
    },
  };
});

export function toExperiencePoolConnectionString(url: string): string {
  const parsed = parseExperienceDatabaseUrl(url);
  parsed.searchParams.delete('schema');
  return parsed.toString();
}

export function assertExperienceDatabaseUrl(
  url: string,
  nodeEnv: NodeEnvName,
): void {
  const parsed = parseExperienceDatabaseUrl(url);
  const database = decodeURIComponent(
    parsed.pathname.replace(/^\/+|\/+$/g, ''),
  );
  if (database !== EXPERIENCE_DATABASE_NAME) {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: must use database memora',
    );
  }

  const username = decodeURIComponent(parsed.username);
  if (username.trim() === '') {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: must include a database user',
    );
  }
  if (
    nodeEnv === 'production' &&
    POSTGRES_SUPERUSER_ROLES.has(username.toLowerCase())
  ) {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: production runtime must not use the PostgreSQL superuser',
    );
  }

  const schema = parsed.searchParams.get('schema');
  if (
    schema !== null &&
    !EXPERIENCE_OWNED_SCHEMAS.includes(schema as ExperienceOwnedSchema)
  ) {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: schema must be an Experience schema',
    );
  }

  const optionTokens = (parsed.searchParams.get('options') ?? '')
    .split(/[^a-z0-9_]+/i)
    .filter((token) => token !== '');
  if (
    optionTokens.some((token) =>
      EXPERIENCE_FORBIDDEN_SCHEMAS.includes(
        token as (typeof EXPERIENCE_FORBIDDEN_SCHEMAS)[number],
      ),
    )
  ) {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: must not set a non-Experience search_path',
    );
  }
}

function parseExperienceDatabaseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: must be a PostgreSQL connection URL',
    );
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      'Environment validation failed: EXPERIENCE_DATABASE_URL: must be a PostgreSQL connection URL',
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
