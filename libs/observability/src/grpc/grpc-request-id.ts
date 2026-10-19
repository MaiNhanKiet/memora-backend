import { Metadata } from '@grpc/grpc-js';
import {
  getActorContext,
  getRequestId,
  parseActorContext,
  type ActorContext,
} from '../correlation/correlation-context';
import {
  ACTOR_ID_METADATA_KEY,
  ACTOR_TYPE_METADATA_KEY,
  CUSTOMER_IDENTITY_METADATA_KEY,
  REQUEST_ID_METADATA_KEY,
  firstHeaderValue,
  resolveRequestId,
} from '../correlation/request-id';

export function createOutgoingGrpcMetadata(): Metadata {
  const metadata = new Metadata();
  const requestId = getRequestId();
  if (requestId !== undefined) {
    metadata.set(REQUEST_ID_METADATA_KEY, requestId);
  }
  const actor = getActorContext();
  metadata.set(ACTOR_TYPE_METADATA_KEY, actor.actorType);
  metadata.set(ACTOR_ID_METADATA_KEY, actor.actorId);
  if (actor.customerIdentityId !== undefined) {
    metadata.set(CUSTOMER_IDENTITY_METADATA_KEY, actor.customerIdentityId);
  }
  return metadata;
}

export function readIncomingGrpcRequestId(metadata: unknown): string {
  return resolveRequestId(readMetadataValue(metadata, REQUEST_ID_METADATA_KEY));
}

export function readIncomingActor(metadata: unknown): ActorContext {
  return parseActorContext(
    readMetadataText(metadata, ACTOR_TYPE_METADATA_KEY),
    readMetadataText(metadata, ACTOR_ID_METADATA_KEY),
    readMetadataText(metadata, CUSTOMER_IDENTITY_METADATA_KEY),
  );
}

function readMetadataText(metadata: unknown, key: string): string | undefined {
  const value = readMetadataValue(metadata, key);
  return typeof value === 'string' ? value : undefined;
}

function readMetadataValue(metadata: unknown, key: string): unknown {
  if (!hasMetadataGet(metadata)) {
    return undefined;
  }
  const values = metadata.get(key);
  return firstHeaderValue(values);
}

function hasMetadataGet(
  value: unknown,
): value is { get: (key: string) => unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof value.get === 'function'
  );
}
