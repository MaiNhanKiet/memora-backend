export const HANDOVER_PROOF_REPOSITORY = Symbol('HANDOVER_PROOF_REPOSITORY');

export interface HandoverProofRepository {
  findCompletedOrderIdByRingItemId(
    ringItemId: string,
  ): Promise<string | undefined>;
}
