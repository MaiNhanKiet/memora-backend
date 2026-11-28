import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  CreateDesignShareLinkRequest,
  CreateDesignShareLinkResponse,
  RevokeDesignShareLinkRequest,
  RevokeDesignShareLinkResponse,
} from '@app/contracts';
import { CART_REPOSITORY, type CartRepository } from './cart.repository';
import {
  assertShareLinkDraftOwnership,
  validateCartActor,
} from './cart.validation';

@Injectable()
export class CreateDesignShareLinkUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
  ) {}

  async execute(
    request: CreateDesignShareLinkRequest,
  ): Promise<CreateDesignShareLinkResponse> {
    const actor = validateCartActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);
    if (!draft) {
      throw new NotFoundException(`Draft ${request.draftId} not found`);
    }

    assertShareLinkDraftOwnership(draft, actor);

    const days =
      request.expiresInDays && request.expiresInDays > 0
        ? request.expiresInDays
        : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const rawCode = `MMR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    const created = await this.repository.createDesignShareCode({
      draftId: draft.id,
      codeHash,
      expiresAt,
    });

    return {
      linkId: created.id,
      code: rawCode,
      shareUrl: `https://memora.vn/design/shared?code=${rawCode}`,
      status: created.status,
      expiresAt: created.expiresAt.toISOString(),
    };
  }
}

@Injectable()
export class RevokeDesignShareLinkUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
  ) {}

  async execute(
    request: RevokeDesignShareLinkRequest,
  ): Promise<RevokeDesignShareLinkResponse> {
    const actor = validateCartActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);
    if (!draft) {
      throw new NotFoundException(`Draft ${request.draftId} not found`);
    }

    assertShareLinkDraftOwnership(draft, actor);

    const designCode = await this.repository.findDesignCodeById(
      request.linkId,
      request.draftId,
    );
    if (!designCode) {
      throw new NotFoundException(
        `Share link ${request.linkId} not found for this draft`,
      );
    }

    if (designCode.status === 'REVOKED') {
      return {
        success: true,
        message: 'Share link already revoked',
      };
    }

    await this.repository.revokeDesignShareCode(designCode.id);

    return {
      success: true,
      message: 'Share link revoked successfully',
    };
  }
}
