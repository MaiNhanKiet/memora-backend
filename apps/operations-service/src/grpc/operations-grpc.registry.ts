/**
 * gRPC protos hosted by operations-service.
 * To expose a business API: add ONE entry for its proto here. main.ts reads this
 * list, so no other bootstrap change is needed. `file` is relative to `proto/`.
 */
export const OPERATIONS_GRPC_PROTOS = [
  { package: 'grpc.health.v1', file: 'grpc/health/v1/health.proto' },
] as const;
