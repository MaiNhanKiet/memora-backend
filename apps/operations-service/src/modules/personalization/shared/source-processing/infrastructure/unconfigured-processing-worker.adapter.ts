import {
  ProcessingWorkerError,
  type FingerprintCropRendered,
  type FingerprintFramesCatalog,
  type FingerprintProcessed,
  type FingerprintVersionSelected,
  type ProcessingWorkerPort,
  type SoundwaveProcessed,
  type SoundwaveStylesCatalog,
  type WavecodeStyleSelected,
  type WavecodeRendered,
} from '../application/processing-worker.port';

/**
 * Used in development when OPERATIONS_PROCESSING_WORKER_* is not set. Every call fails as
 * transient, so jobs retry and end in WORKER_UNAVAILABLE instead of silently succeeding.
 */
export class UnconfiguredProcessingWorkerAdapter implements ProcessingWorkerPort {
  processFingerprint(): Promise<FingerprintProcessed> {
    return Promise.reject(unconfigured());
  }

  processSoundwave(): Promise<SoundwaveProcessed> {
    return Promise.reject(unconfigured());
  }

  renderWavecode(): Promise<WavecodeRendered> {
    return Promise.reject(unconfigured());
  }

  renderFingerprintCrop(): Promise<FingerprintCropRendered> {
    return Promise.reject(unconfigured());
  }

  selectFingerprintVersion(): Promise<FingerprintVersionSelected> {
    return Promise.reject(unconfigured());
  }

  listFingerprintFrames(): Promise<FingerprintFramesCatalog> {
    return Promise.reject(unconfigured());
  }

  selectWavecodeStyle(): Promise<WavecodeStyleSelected> {
    return Promise.reject(unconfigured());
  }

  listSoundwaveStyles(): Promise<SoundwaveStylesCatalog> {
    return Promise.reject(unconfigured());
  }
}

function unconfigured(): ProcessingWorkerError {
  return new ProcessingWorkerError(
    'TRANSIENT',
    'Processing worker is not configured',
  );
}
