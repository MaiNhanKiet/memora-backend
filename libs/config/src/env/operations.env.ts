import { Expose } from 'class-transformer';
import { registerAs } from '@nestjs/config';
import {
  EnvHostname,
  EnvPort,
  EnvPostgresUrl,
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
}

export interface OperationsEnv {
  NODE_ENV: NodeEnvName;
  OPERATIONS_GRPC_HOST: string;
  OPERATIONS_GRPC_PORT: number;
  OPERATIONS_HEALTH_HOST: string;
  OPERATIONS_HEALTH_PORT: number;
  OPERATIONS_DATABASE_URL: string;
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
  });
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
  };
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
