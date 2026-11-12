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
}

export interface ExperienceEnv {
  NODE_ENV: NodeEnvName;
  EXPERIENCE_GRPC_HOST: string;
  EXPERIENCE_GRPC_PORT: number;
  EXPERIENCE_HEALTH_HOST: string;
  EXPERIENCE_HEALTH_PORT: number;
  EXPERIENCE_DATABASE_URL: string;
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
  });
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
