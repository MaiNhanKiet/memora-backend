import type { VerifiedActor } from '@app/contracts';

export const MEMORY_ACTIVATION_ELIGIBILITY = Symbol(
  'MEMORY_ACTIVATION_ELIGIBILITY',
);

export interface MemoryActivationEligibility {
  isEligible(ringItemId: string, actor: VerifiedActor): Promise<boolean>;
}
