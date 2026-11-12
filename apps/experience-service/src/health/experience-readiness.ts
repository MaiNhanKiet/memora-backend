import {
  EXPERIENCE_DATABASE_NAME,
  EXPERIENCE_OWNED_SCHEMAS,
  type ExperienceOwnedSchema,
  type NodeEnvName,
} from '@app/config';

export interface ExperienceHealthReport {
  readonly ready: boolean;
  readonly postgres: 'up' | 'down';
  readonly database?: 'ok' | 'rejected';
  readonly runtimeRole?: 'ok' | 'rejected';
  readonly schemas?: Readonly<
    Record<ExperienceOwnedSchema, 'present' | 'missing'>
  >;
}

export interface ExperienceProbeFacts {
  readonly database: string;
  readonly superuser: boolean;
  readonly presentSchemas: readonly string[];
  readonly nodeEnv: NodeEnvName;
}

export function buildExperienceReadinessReport(
  facts: ExperienceProbeFacts,
): ExperienceHealthReport {
  const schemas = schemaPresence(facts.presentSchemas);
  const database =
    facts.database === EXPERIENCE_DATABASE_NAME ? 'ok' : 'rejected';
  const runtimeRole =
    facts.nodeEnv === 'production' && facts.superuser ? 'rejected' : 'ok';
  const schemasReady = EXPERIENCE_OWNED_SCHEMAS.every(
    (schema) => schemas[schema] === 'present',
  );

  return {
    ready: database === 'ok' && runtimeRole === 'ok' && schemasReady,
    postgres: 'up',
    database,
    runtimeRole,
    schemas,
  };
}

export function unavailableExperienceReport(): ExperienceHealthReport {
  return {
    ready: false,
    postgres: 'down',
  };
}

function schemaPresence(
  presentSchemas: readonly string[],
): Record<ExperienceOwnedSchema, 'present' | 'missing'> {
  const present = new Set(presentSchemas);
  return {
    memory: present.has('memory') ? 'present' : 'missing',
    platform: present.has('platform') ? 'present' : 'missing',
  };
}
