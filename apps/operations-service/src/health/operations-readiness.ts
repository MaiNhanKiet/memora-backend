import {
  OPERATIONS_DATABASE_NAME,
  OPERATIONS_OWNED_SCHEMAS,
  type NodeEnvName,
  type OperationsOwnedSchema,
} from '@app/config';

export interface OperationsHealthReport {
  readonly ready: boolean;
  readonly postgres: 'up' | 'down';
  readonly database?: 'ok' | 'rejected';
  readonly runtimeRole?: 'ok' | 'rejected';
  readonly schemas?: Readonly<
    Record<OperationsOwnedSchema, 'present' | 'missing'>
  >;
}

export interface OperationsProbeFacts {
  readonly database: string;
  readonly superuser: boolean;
  readonly presentSchemas: readonly string[];
  readonly nodeEnv: NodeEnvName;
}

export function buildOperationsReadinessReport(
  facts: OperationsProbeFacts,
): OperationsHealthReport {
  const schemas = schemaPresence(facts.presentSchemas);
  const database =
    facts.database === OPERATIONS_DATABASE_NAME ? 'ok' : 'rejected';
  const runtimeRole =
    facts.nodeEnv === 'production' && facts.superuser ? 'rejected' : 'ok';
  const schemasReady = OPERATIONS_OWNED_SCHEMAS.every(
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

export function unavailableOperationsReport(): OperationsHealthReport {
  return {
    ready: false,
    postgres: 'down',
  };
}

function schemaPresence(
  presentSchemas: readonly string[],
): Record<OperationsOwnedSchema, 'present' | 'missing'> {
  const present = new Set(presentSchemas);
  return {
    personalization: present.has('personalization') ? 'present' : 'missing',
    production: present.has('production') ? 'present' : 'missing',
    fulfillment: present.has('fulfillment') ? 'present' : 'missing',
    after_sales: present.has('after_sales') ? 'present' : 'missing',
  };
}
