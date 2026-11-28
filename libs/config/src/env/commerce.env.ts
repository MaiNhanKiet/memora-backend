import { Expose } from 'class-transformer';
import { IsOptional, Validate } from 'class-validator';
import { registerAs } from '@nestjs/config';
import {
  EnvHostname,
  EnvHttpUrl,
  EnvPort,
  EnvPostgresUrl,
  EnvSecret,
  GrpcUrlConstraint,
  parseEnvText,
} from '../validation/env-constraints';
import { validateEnv } from '../validation/validate-env';
import { loadEnvFile } from './load-env-file';
import { NodeEnvironment, type NodeEnvName } from './node-environment';

export const COMMERCE_DATABASE_NAME = 'memora';

export const COMMERCE_OWNED_SCHEMAS = [
  'catalog',
  'pricing',
  'inventory',
  'design',
  'ordering',
] as const;

export type CommerceOwnedSchema = (typeof COMMERCE_OWNED_SCHEMAS)[number];

export const COMMERCE_FORBIDDEN_SCHEMAS = [
  'iam',
  'personalization',
  'production',
  'fulfillment',
  'after_sales',
  'memory',
  'platform',
] as const;

const POSTGRES_SUPERUSER_ROLES = new Set(['postgres']);

export class CommerceEnvironment extends NodeEnvironment {
  @Expose()
  @EnvHostname()
  COMMERCE_GRPC_HOST!: string;

  @Expose()
  @EnvPort()
  COMMERCE_GRPC_PORT!: number;

  @Expose()
  @EnvHostname()
  COMMERCE_HEALTH_HOST!: string;

  @Expose()
  @EnvPort()
  COMMERCE_HEALTH_PORT!: number;

  @Expose()
  @EnvPostgresUrl()
  COMMERCE_DATABASE_URL!: string;

  @Expose()
  @EnvSecret(32)
  COMMERCE_INTERNAL_GRPC_SECRET!: string;

  @Expose()
  @IsOptional()
  @Validate(GrpcUrlConstraint)
  OPERATIONS_GRPC_URL?: string;

  @Expose()
  @IsOptional()
  @EnvSecret(32)
  OPERATIONS_INTERNAL_GRPC_SECRET?: string;

  @Expose()
  @EnvHttpUrl()
  CATALOG_CDN_BASE_URL!: string;

  @Expose()
  @IsOptional()
  @EnvSecret(1)
  PAYOS_CLIENT_ID?: string;

  @Expose()
  @IsOptional()
  @EnvSecret(1)
  PAYOS_API_KEY?: string;

  @Expose()
  @IsOptional()
  @EnvSecret(1)
  PAYOS_CHECKSUM_KEY?: string;
}

export interface CommerceEnv {
  NODE_ENV: NodeEnvName;
  COMMERCE_GRPC_HOST: string;
  COMMERCE_GRPC_PORT: number;
  COMMERCE_HEALTH_HOST: string;
  COMMERCE_HEALTH_PORT: number;
  COMMERCE_DATABASE_URL: string;
  COMMERCE_INTERNAL_GRPC_SECRET: string;
  OPERATIONS_GRPC_URL?: string;
  OPERATIONS_INTERNAL_GRPC_SECRET?: string;
  CATALOG_CDN_BASE_URL: string;
  PAYOS_CLIENT_ID?: string;
  PAYOS_API_KEY?: string;
  PAYOS_CHECKSUM_KEY?: string;
}

export function validateCommerceEnv(
  source: NodeJS.ProcessEnv | Record<string, unknown>,
): CommerceEnv {
  const validated = validateEnv(CommerceEnvironment, {
    ...source,
    COMMERCE_GRPC_HOST: defaultText(source.COMMERCE_GRPC_HOST, '0.0.0.0'),
    COMMERCE_GRPC_PORT: defaultText(source.COMMERCE_GRPC_PORT, '50052'),
    COMMERCE_HEALTH_HOST: defaultText(source.COMMERCE_HEALTH_HOST, '127.0.0.1'),
    COMMERCE_HEALTH_PORT: defaultText(source.COMMERCE_HEALTH_PORT, '5052'),
    CATALOG_CDN_BASE_URL: defaultText(
      source.CATALOG_CDN_BASE_URL,
      'https://cdn.memora.style',
    ),
    OPERATIONS_GRPC_URL: optionalText(source.OPERATIONS_GRPC_URL),
    OPERATIONS_INTERNAL_GRPC_SECRET: optionalText(
      source.OPERATIONS_INTERNAL_GRPC_SECRET,
    ),
    PAYOS_CLIENT_ID: optionalText(source.PAYOS_CLIENT_ID),
    PAYOS_API_KEY: optionalText(source.PAYOS_API_KEY),
    PAYOS_CHECKSUM_KEY: optionalText(source.PAYOS_CHECKSUM_KEY),
  });
  if (
    validated.OPERATIONS_GRPC_URL &&
    !validated.OPERATIONS_INTERNAL_GRPC_SECRET
  ) {
    throw new Error(
      'OPERATIONS_GRPC_URL requires OPERATIONS_INTERNAL_GRPC_SECRET',
    );
  }
  assertCommerceDatabaseUrl(
    validated.COMMERCE_DATABASE_URL,
    validated.NODE_ENV,
  );
  return {
    NODE_ENV: validated.NODE_ENV,
    COMMERCE_GRPC_HOST: validated.COMMERCE_GRPC_HOST,
    COMMERCE_GRPC_PORT: validated.COMMERCE_GRPC_PORT,
    COMMERCE_HEALTH_HOST: validated.COMMERCE_HEALTH_HOST,
    COMMERCE_HEALTH_PORT: validated.COMMERCE_HEALTH_PORT,
    COMMERCE_DATABASE_URL: validated.COMMERCE_DATABASE_URL,
    COMMERCE_INTERNAL_GRPC_SECRET: validated.COMMERCE_INTERNAL_GRPC_SECRET,
    OPERATIONS_GRPC_URL: validated.OPERATIONS_GRPC_URL,
    OPERATIONS_INTERNAL_GRPC_SECRET: validated.OPERATIONS_INTERNAL_GRPC_SECRET,
    CATALOG_CDN_BASE_URL: validated.CATALOG_CDN_BASE_URL,
    PAYOS_CLIENT_ID: validated.PAYOS_CLIENT_ID,
    PAYOS_API_KEY: validated.PAYOS_API_KEY,
    PAYOS_CHECKSUM_KEY: validated.PAYOS_CHECKSUM_KEY,
  };
}

export function loadCommerceRuntimeConfig(): CommerceEnv {
  loadEnvFile();
  return validateCommerceEnv(process.env);
}

export const commerceConfig = registerAs('commerce', () => {
  const env = validateCommerceEnv(process.env);
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = env;
  return {
    nodeEnv: env.NODE_ENV,
    grpcHost: env.COMMERCE_GRPC_HOST,
    grpcPort: env.COMMERCE_GRPC_PORT,
    healthHost: env.COMMERCE_HEALTH_HOST,
    healthPort: env.COMMERCE_HEALTH_PORT,
    databaseUrl: env.COMMERCE_DATABASE_URL,
    internalGrpcSecret: env.COMMERCE_INTERNAL_GRPC_SECRET,
    operationsClaimAccess:
      env.OPERATIONS_GRPC_URL && env.OPERATIONS_INTERNAL_GRPC_SECRET
        ? {
            url: env.OPERATIONS_GRPC_URL,
            secret: env.OPERATIONS_INTERNAL_GRPC_SECRET,
          }
        : undefined,
    catalogCdnBaseUrl: env.CATALOG_CDN_BASE_URL,
    payos:
      PAYOS_CLIENT_ID && PAYOS_API_KEY && PAYOS_CHECKSUM_KEY
        ? {
            clientId: PAYOS_CLIENT_ID,
            apiKey: PAYOS_API_KEY,
            checksumKey: PAYOS_CHECKSUM_KEY,
          }
        : undefined,
  };
});

export function toCommercePoolConnectionString(url: string): string {
  const parsed = parseCommerceDatabaseUrl(url);
  parsed.searchParams.delete('schema');
  return parsed.toString();
}

export function assertCommerceDatabaseUrl(
  url: string,
  nodeEnv: NodeEnvName,
): void {
  const parsed = parseCommerceDatabaseUrl(url);
  const database = decodeURIComponent(
    parsed.pathname.replace(/^\/+|\/+$/g, ''),
  );
  if (database !== COMMERCE_DATABASE_NAME) {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: must use database memora',
    );
  }

  const username = decodeURIComponent(parsed.username);
  if (username.trim() === '') {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: must include a database user',
    );
  }
  if (
    nodeEnv === 'production' &&
    POSTGRES_SUPERUSER_ROLES.has(username.toLowerCase())
  ) {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: production runtime must not use the PostgreSQL superuser',
    );
  }

  const schema = parsed.searchParams.get('schema');
  if (
    schema !== null &&
    !COMMERCE_OWNED_SCHEMAS.includes(schema as CommerceOwnedSchema)
  ) {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: schema must be a Commerce schema',
    );
  }

  const optionTokens = (parsed.searchParams.get('options') ?? '')
    .split(/[^a-z0-9_]+/i)
    .filter((token) => token !== '');
  if (
    optionTokens.some((token) =>
      COMMERCE_FORBIDDEN_SCHEMAS.includes(
        token as (typeof COMMERCE_FORBIDDEN_SCHEMAS)[number],
      ),
    )
  ) {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: must not set a non-Commerce search_path',
    );
  }
}

function parseCommerceDatabaseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: must be a PostgreSQL connection URL',
    );
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      'Environment validation failed: COMMERCE_DATABASE_URL: must be a PostgreSQL connection URL',
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

function optionalText(value: unknown): unknown {
  const normalized = parseEnvText(value);
  return normalized === '' ? undefined : normalized;
}
