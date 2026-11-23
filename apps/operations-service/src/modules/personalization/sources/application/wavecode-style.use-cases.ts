import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type {
  AcceptWavecodeStyleRequest,
  GetSoundwaveWavecodeRequest,
  SelectWavecodeStyleRequest,
  SoundwaveWavecode,
} from '@app/contracts';
import { sourceOutputPrefix } from '../../shared/source-processing/source-processing.constants';
import { sourceErrors, SourceReason } from './sources.errors';
import type { WavecodeState } from '../../shared/source-processing/application/wavecode-state';
import {
  fromWorkerStyles,
  requireSourceId,
  requireStyle,
  WavecodeSupport,
} from './wavecode-support';
import {
  WAVECODE_REPOSITORY,
  type WavecodeRepository,
  type WavecodeSourceRecord,
} from './wavecode.repository';

/** PERSO-032. Read only, no worker call. */
@Injectable()
export class GetSoundwaveWavecodeUseCase {
  constructor(
    @Inject(WAVECODE_REPOSITORY) private readonly sources: WavecodeRepository,
    private readonly support: WavecodeSupport,
  ) {}

  async execute(
    request: GetSoundwaveWavecodeRequest,
  ): Promise<SoundwaveWavecode> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const record = await this.sources.find(sourceId, actor.customerIdentityId);
    if (record === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }
    return this.support.toResponse(record);
  }
}

/**
 * PERSO-033. Under the wavecode lock: reuse a generated style (no worker call) or ask the
 * worker to render it, then make it the current style. Locked after PERSO-034.
 */
@Injectable()
export class SelectWavecodeStyleUseCase {
  constructor(
    @Inject(WAVECODE_REPOSITORY) private readonly sources: WavecodeRepository,
    private readonly support: WavecodeSupport,
  ) {}

  async execute(
    request: SelectWavecodeStyleRequest,
  ): Promise<SoundwaveWavecode> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const style = requireStyle(request.style);

    const updated = await this.sources.updateLocked(
      sourceId,
      actor.customerIdentityId,
      async (record) => {
        const state = this.support.requireReady(record);
        if (state.acceptedStyle !== undefined) {
          throw sourceErrors.conflict(SourceReason.WAVECODE_STYLE_LOCKED);
        }
        const ready = await this.support.ensureGenerated(record, state, style);
        return { ...ready, style };
      },
    );
    if (updated === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }
    return this.support.toResponse(updated);
  }
}

/**
 * PERSO-034. Generates the style when needed, records the acceptance in the database, then
 * (after commit) asks the worker to delete the other styles. A worker failure after the
 * commit is only logged; calling accept again with the same style retries the cleanup while
 * more than one style is still recorded. This does not replace customer approval (PERSO-018).
 */
@Injectable()
export class AcceptWavecodeStyleUseCase {
  private readonly logger = new Logger(AcceptWavecodeStyleUseCase.name);

  constructor(
    @Inject(WAVECODE_REPOSITORY) private readonly sources: WavecodeRepository,
    private readonly support: WavecodeSupport,
  ) {}

  async execute(
    request: AcceptWavecodeStyleRequest,
  ): Promise<SoundwaveWavecode> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const requested =
      request.style === undefined ||
      request.style === null ||
      request.style === ''
        ? undefined
        : requireStyle(request.style);

    let accepted = requested;
    const committed = await this.sources.updateLocked(
      sourceId,
      actor.customerIdentityId,
      async (record) => {
        const state = this.support.requireReady(record);
        const style = requested ?? state.acceptedStyle ?? state.style;
        accepted = style;
        if (
          state.acceptedStyle !== undefined &&
          state.acceptedStyle !== style
        ) {
          throw sourceErrors.conflict(SourceReason.WAVECODE_STYLE_LOCKED);
        }
        if (state.acceptedStyle === style) {
          return undefined;
        }
        const ready = await this.support.ensureGenerated(record, state, style);
        return {
          ...ready,
          style,
          acceptedStyle: style,
          acceptedAt: new Date().toISOString(),
        };
      },
    );
    if (committed === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }

    const state = committed.wavecode;
    if (
      state !== undefined &&
      accepted !== undefined &&
      Object.keys(state.styles).length > 1
    ) {
      const done = await this.cleanUp(
        committed,
        actor.customerIdentityId,
        accepted,
      );
      return this.support.toResponse(done ?? committed);
    }
    return this.support.toResponse(committed);
  }

  /** Never throws: the acceptance is already committed. */
  private async cleanUp(
    record: WavecodeSourceRecord,
    owner: string,
    style: string,
  ): Promise<WavecodeSourceRecord | undefined> {
    if (record.orderId === undefined) {
      return undefined;
    }
    try {
      const selected = await this.support.worker.selectWavecodeStyle({
        sourceId: record.sourceId,
        outputPrefix: sourceOutputPrefix(
          'SOUNDWAVE',
          record.orderId,
          record.sourceId,
        ),
        style,
        context: { orderId: record.orderId, ringItemIds: record.ringItemIds },
      });
      const fromWorker = fromWorkerStyles(selected.styles)[style];
      return await this.sources.updateLocked(
        record.sourceId,
        owner,
        (fresh): Promise<WavecodeState | undefined> => {
          const current = fresh.wavecode;
          const keep = fromWorker ?? current?.styles[style];
          if (
            current === undefined ||
            current.acceptedStyle !== style ||
            keep === undefined
          ) {
            return Promise.resolve(undefined);
          }
          return Promise.resolve({ ...current, styles: { [style]: keep } });
        },
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Deleting the other wavecode styles of source ${record.sourceId} failed; accept again to retry: ${reason}`,
      );
      return undefined;
    }
  }
}
