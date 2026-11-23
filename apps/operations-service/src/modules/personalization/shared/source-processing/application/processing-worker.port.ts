/** Port to the Python processing worker (docs/api/personalization/processing-worker.md). */

export interface WorkerObject {
  readonly key: string;
  readonly sha256: string;
}

export interface WorkerOutputs {
  readonly vectorSvg: WorkerObject;
  readonly manifest: WorkerObject;
  /** The 3 s segment (soundwave/process only); unset for older workers and render calls. */
  readonly audioSegment?: WorkerObject;
}

export interface FingerprintArtwork {
  readonly aspectRatio: number;
  readonly hull: readonly (readonly number[])[];
}

/** One file of a style as the worker reports it. */
export interface WorkerFile {
  readonly key: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface WorkerStyleFiles {
  readonly vectorSvg: WorkerFile;
  readonly alphaPng: WorkerFile;
}

export interface WavecodeResult {
  readonly scheme: string;
  /** Style the worker drew with; unset when an older worker does not report it. */
  readonly style?: string;
  /** Generated styles by code; unset when an older worker does not report them. */
  readonly styles?: Readonly<Record<string, WorkerStyleFiles>>;
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
  /** True when the style already existed for these levels (no new files). */
  readonly reused: boolean;
  readonly processorVersion: string | undefined;
  readonly outputs: WorkerOutputs;
  readonly wavecode: WavecodeResult;
}

/** Optional traceability data the worker copies into manifest.json. */
export interface WorkerContext {
  readonly orderId: string;
  readonly sessionId?: string;
  readonly attemptNo?: number;
  readonly ringItemIds: readonly string[];
}

export interface ProcessFingerprintInput {
  readonly sourceId: string;
  readonly rawKey: string;
  readonly outputPrefix: string;
  readonly context: WorkerContext;
}

export interface ProcessSoundwaveInput {
  readonly sourceId: string;
  readonly rawKey: string;
  readonly outputPrefix: string;
  readonly contentType: string;
  readonly declaredDurationMs: number;
  readonly segmentStartMs: number;
  readonly segmentDurationMs: number;
  /** CLASSIC | HAIRLINE | OSCILLOSCOPE (PERSO-031). */
  readonly style: string;
  readonly context: WorkerContext;
}

export interface RenderWavecodeInput {
  readonly sourceId: string;
  readonly outputPrefix: string;
  readonly levels: readonly number[];
  readonly style: string;
  readonly context: WorkerContext;
}

export interface SelectWavecodeStyleInput {
  readonly sourceId: string;
  readonly outputPrefix: string;
  readonly style: string;
  readonly context: WorkerContext;
}

export interface WavecodeStyleSelected {
  /** Only the accepted style remains. */
  readonly styles: Readonly<Record<string, WorkerStyleFiles>> | undefined;
  readonly deleted: readonly string[];
}

export interface WorkerSoundwaveStyle {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly decoder: string;
  readonly sampleSvg: string;
}

export interface SoundwaveStylesCatalog {
  readonly defaultStyle: string;
  readonly styles: readonly WorkerSoundwaveStyle[];
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
  /** POST /v1/soundwave/select-wavecode-style (PERSO-034): keeps one style, deletes the rest. */
  selectWavecodeStyle(
    input: SelectWavecodeStyleInput,
  ): Promise<WavecodeStyleSelected>;
  /** GET /v1/soundwave/presets (PERSO-031). */
  listSoundwaveStyles(): Promise<SoundwaveStylesCatalog>;
}

export const PROCESSING_WORKER_PORT = Symbol('PROCESSING_WORKER_PORT');
