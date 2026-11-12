import {
  COMMERCE_DATABASE_NAME,
  COMMERCE_OWNED_SCHEMAS,
  type CommerceOwnedSchema,
  type NodeEnvName,
} from '@app/config';

export interface CommerceHealthReport {
  readonly ready: boolean;
  readonly postgres: 'up' | 'down';
  readonly database?: 'ok' | 'rejected';
  readonly runtimeRole?: 'ok' | 'rejected';
  readonly schemas?: Readonly<
    Record<CommerceOwnedSchema, 'present' | 'missing'>
  >;
}

export interface CommerceProbeFacts {
  readonly database: string;
  readonly superuser: boolean;
  readonly presentSchemas: readonly string[];
  readonly nodeEnv: NodeEnvName;
}

export function buildCommerceReadinessReport(
  facts: CommerceProbeFacts,
): CommerceHealthReport {
  const schemas = schemaPresence(facts.presentSchemas);
  const database =
    facts.database === COMMERCE_DATABASE_NAME ? 'ok' : 'rejected';
  const runtimeRole =
    facts.nodeEnv === 'production' && facts.superuser ? 'rejected' : 'ok';
  const schemasReady = COMMERCE_OWNED_SCHEMAS.every(
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

export function unavailableCommerceReport(): CommerceHealthReport {
  return {
    ready: false,
    postgres: 'down',
  };
}

function schemaPresence(
  presentSchemas: readonly string[],
): Record<CommerceOwnedSchema, 'present' | 'missing'> {
  const present = new Set(presentSchemas);
  return {
    catalog: present.has('catalog') ? 'present' : 'missing',
    pricing: present.has('pricing') ? 'present' : 'missing',
    inventory: present.has('inventory') ? 'present' : 'missing',
    design: present.has('design') ? 'present' : 'missing',
    ordering: present.has('ordering') ? 'present' : 'missing',
  };
}
