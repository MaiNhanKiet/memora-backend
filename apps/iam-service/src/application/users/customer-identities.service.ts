import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type CustomerIdentity,
} from '../../../generated/prisma/client';
import {
  CustomerIdentityRepository,
  type LinkGuestIdentityResult,
} from '../../repositories/customer-identity.repository';

@Injectable()
export class CustomerIdentitiesService {
  constructor(private readonly identities: CustomerIdentityRepository) {}

  findById(id: string): Promise<CustomerIdentity | null> {
    return this.identities.findById(id);
  }

  findLinkedByUserId(userId: string): Promise<CustomerIdentity[]> {
    return this.identities.findByUserId(userId);
  }

  findPrimaryByUserId(userId: string): Promise<CustomerIdentity | null> {
    return this.identities.findPrimaryByUserId(userId);
  }

  createVerifiedGuest(input: {
    id: string;
    contactEmail: string;
  }): Promise<CustomerIdentity> {
    return this.identities.create({
      id: input.id,
      contactEmail: input.contactEmail,
      userId: null,
      isPrimaryForUser: false,
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    });
  }

  linkVerifiedGuestAsPrimary(
    identityId: string,
    userId: string,
    audit: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<LinkGuestIdentityResult> {
    return this.identities.linkVerifiedGuestAsPrimary(
      identityId,
      userId,
      audit,
    );
  }
}
