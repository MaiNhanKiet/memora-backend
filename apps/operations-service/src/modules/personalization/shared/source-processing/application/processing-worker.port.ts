/** Port to the Python processing worker (docs/api/personalization/processing-worker.md). */

export interface WorkerObject {
  readonly key: string;
  readonly sha256: string;
}

export interface WorkerOutputs {
  readonly vectorSvg: WorkerObject;
  readonly manifest: WorkerObject;
}

export interface FingerprintArtwork {
  readonly aspectRatio: number;
  readonly hull: readonly (readonly number[])[];
}

export interface WavecodeResult {
  readonly scheme: string;
  readonly levels: readonly number[];
  readonly checkBars: readonly number[];
  readonly nudgeCandidates: readonly (readonly number[])[];
}

export interface FingerprintProcessed {
  readonly processorVersion: string;
  readonly outputs: WorkerOutputs;
  readonly artwork: FingerprintArtwork;
}

export interface SoundwaveProcessed {
  readonly processorVersion: string;
  readonly measuredDurationMs: number;
  readonly outputs: WorkerOutputs;
  readonly wavecode: WavecodeResult;
}

export interface WavecodeRendered {
  readonly processorVersion: string | undefined;
  readonly outputs: WorkerOutputs;
  readonly wavecode: WavecodeResult;
}

export interface ProcessFingerprintInput {
  readonly sourceId: string;
  readonly rawKey: string;
  readonly outputPrefix: string;
}

export interface ProcessSoundwaveInput {
  readonly sourceId: string;
  readonly rawKey: string;
  readonly outputPrefix: string;
  readonly contentType: string;
  readonly declaredDurationMs: number;
  readonly segmentStartMs: number;
  readonly segmentDurationMs: number;
}

export interface RenderWavecodeInput {
  readonly sourceId: string;
  readonly outputPrefix: string;
  readonly levels: readonly number[];
}

/**
 * DATA: the input is bad, retrying cannot help (4xx except 401/408/429).
 * UNAUTHORIZED: secret mismatch (401).
 * TRANSIENT: network, timeout, 5xx; the job retries.
 */
export type ProcessingWorkerErrorKind = 'DATA' | 'UNAUTHORIZED' | 'TRANSIENT';

export class ProcessingWorkerError extends Error {
  constructor(
    readonly kind: ProcessingWorkerErrorKind,
    message: string,
    /** Worker failure code for DATA errors; unset otherwise. */
    readonly failureCode?: string,
  ) {
    super(message);
    this.name = 'ProcessingWorkerError';
  }
}

export interface ProcessingWorkerPort {
  processFingerprint(
    input: ProcessFingerprintInput,
  ): Promise<FingerprintProcessed>;
  processSoundwave(input: ProcessSoundwaveInput): Promise<SoundwaveProcessed>;
  renderWavecode(input: RenderWavecodeInput): Promise<WavecodeRendered>;
}

export const PROCESSING_WORKER_PORT = Symbol('PROCESSING_WORKER_PORT');
