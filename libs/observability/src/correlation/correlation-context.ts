import { AsyncLocalStorage } from 'node:async_hooks';

export const ACTOR_TYPE = {
  USER: 'USER',
  GUEST: 'GUEST',
  ANONYMOUS: 'ANONYMOUS',
} as const;

export type ActorType = (typeof ACTOR_TYPE)[keyof typeof ACTOR_TYPE];

export interface ActorContext {
  actorId: string;
  actorType: ActorType;
  customerIdentityId?: string;
}

export const ANONYMOUS_ACTOR: ActorContext = {
  actorId: 'anonymous',
  actorType: ACTOR_TYPE.ANONYMOUS,
};

export interface CorrelationStore {
  requestId: string;
  actor: ActorContext;
}

const storage = new AsyncLocalStorage<CorrelationStore>();
const ACTOR_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function runWithCorrelation<T>(store: CorrelationStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getActorContext(): ActorContext {
  return storage.getStore()?.actor ?? ANONYMOUS_ACTOR;
}

export function setActorContext(actor: ActorContext): void {
  const store = storage.getStore();
  if (store === undefined) {
    return;
  }
  store.actor = actor;
}

export function getCorrelationStore(): CorrelationStore | undefined {
  return storage.getStore();
}

export function parseActorContext(
  actorType: string | undefined,
  actorId: string | undefined,
  customerIdentityId: string | undefined,
): ActorContext {
  const identity = isActorId(customerIdentityId)
    ? customerIdentityId
    : undefined;

  if (actorType === ACTOR_TYPE.USER && isActorId(actorId)) {
    return {
      actorType: ACTOR_TYPE.USER,
      actorId,
      ...(identity === undefined ? {} : { customerIdentityId: identity }),
    };
  }

  if (actorType === ACTOR_TYPE.GUEST && isActorId(actorId)) {
    return {
      actorType: ACTOR_TYPE.GUEST,
      actorId,
      customerIdentityId: identity ?? actorId,
    };
  }

  return ANONYMOUS_ACTOR;
}

function isActorId(value: string | undefined): value is string {
  return value !== undefined && ACTOR_ID.test(value);
}
