import {
  ProcessingWorkerError,
  type FingerprintProcessed,
  type ProcessFingerprintInput,
  type ProcessingWorkerPort,
  type ProcessSoundwaveInput,
  type SelectWavecodeStyleInput,
  type RenderWavecodeInput,
  type SoundwaveProcessed,
  type SoundwaveStylesCatalog,
  type WavecodeRendered,
  type WavecodeResult,
  type WavecodeStyleSelected,
  type WorkerFile,
  type WorkerStyleFiles,
  type WorkerObject,
  type WorkerOutputs,
} from '../application/processing-worker.port';
import {
  FINGERPRINT_TIMEOUT_MS,
  RENDER_TIMEOUT_MS,
  SOUNDWAVE_TIMEOUT_MS,
  STYLES_TIMEOUT_MS,
} from '../source-processing.constants';

export interface HttpProcessingWorkerSettings {
  readonly baseUrl: string;
  /** Sent as X-Memora-Worker-Secret. Never logged. */
  readonly secret: string;
}

const FAILURE_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

/** HTTP adapter for docs/api/personalization/processing-worker.md (v1). Keys only, no URLs. */
export class HttpProcessingWorkerAdapter implements ProcessingWorkerPort {
  constructor(private readonly settings: HttpProcessingWorkerSettings) {}

  async processFingerprint(
    input: ProcessFingerprintInput,
  ): Promise<FingerprintProcessed> {
    const body = await this.post(
      '/v1/fingerprint/process',
      input,
      FINGERPRINT_TIMEOUT_MS,
    );
    const artwork = record(body.artwork);
    const hull = artwork?.hull;
    if (
      artwork === undefined ||
      typeof artwork.aspectRatio !== 'number' ||
      !Array.isArray(hull) ||
      !hull.every(
        (point: unknown) =>
          Array.isArray(point) && point.every((v) => typeof v === 'number'),
      )
    ) {
      throw malformed();
    }
    return {
      processorVersion: text(body.processorVersion),
      outputs: outputs(body.outputs),
      artwork: {
        aspectRatio: artwork.aspectRatio,
        hull: hull,
      },
    };
  }

  async processSoundwave(
    input: ProcessSoundwaveInput,
  ): Promise<SoundwaveProcessed> {
    const body = await this.post(
      '/v1/soundwave/process',
      input,
      SOUNDWAVE_TIMEOUT_MS,
    );
    if (typeof body.measuredDurationMs !== 'number') {
      throw malformed();
    }
    return {
      processorVersion: text(body.processorVersion),
      measuredDurationMs: body.measuredDurationMs,
      outputs: outputs(body.outputs),
      wavecode: wavecode(body.wavecode),
    };
  }

  async renderWavecode(input: RenderWavecodeInput): Promise<WavecodeRendered> {
    const body = await this.post(
      '/v1/soundwave/render-wavecode',
      input,
      RENDER_TIMEOUT_MS,
    );
    return {
      reused: body.reused === true,
      processorVersion:
        typeof body.processorVersion === 'string'
          ? body.processorVersion
          : undefined,
      outputs: outputs(body.outputs),
      wavecode: wavecode(body.wavecode),
    };
  }

  async selectWavecodeStyle(
    input: SelectWavecodeStyleInput,
  ): Promise<WavecodeStyleSelected> {
    const body = await this.post(
      '/v1/soundwave/select-wavecode-style',
      input,
      RENDER_TIMEOUT_MS,
    );
    return {
      styles: styleFiles(record(body.wavecode)?.styles),
      deleted: Array.isArray(body.deleted)
        ? body.deleted.filter((key): key is string => typeof key === 'string')
        : [],
    };
  }

  async listSoundwaveStyles(): Promise<SoundwaveStylesCatalog> {
    const data = await this.send(
      'GET',
      '/v1/soundwave/presets',
      undefined,
      STYLES_TIMEOUT_MS,
    );
    if (!Array.isArray(data.styles)) {
      throw malformed();
    }
    return {
      defaultStyle: text(data.defaultStyle),
      styles: data.styles.map((value: unknown) => {
        const item = record(value);
        if (item === undefined) {
          throw malformed();
        }
        return {
          code: text(item.code),
          name: text(item.name),
          description: text(item.description),
          decoder: text(item.decoder),
          sampleSvg: text(item.sampleSvg),
        };
      }),
    };
  }

  private async post(
    path: string,
    payload: { readonly sourceId: string },
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const data = await this.send('POST', path, payload, timeoutMs);
    if (data.status !== 'READY') {
      throw malformed();
    }
    return data;
  }

  /** Returns the envelope `data` of a 2xx answer; maps every failure to ProcessingWorkerError. */
  private async send(
    method: 'GET' | 'POST',
    path: string,
    payload: { readonly sourceId: string } | undefined,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.settings.baseUrl}${path}`, {
        method,
        headers: {
          ...(payload === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
          'X-Memora-Worker-Secret': this.settings.secret,
          // Correlates one call in the worker logs; unique per call (retries differ).
          'X-Request-Id': `${payload?.sourceId ?? 'styles'}-${Date.now().toString(36)}`,
        },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        signal: controller.signal,
      });
    } catch (error: unknown) {
      const reason =
        error instanceof Error && error.name === 'AbortError'
          ? `timed out after ${timeoutMs} ms`
          : 'connection error';
      throw new ProcessingWorkerError('TRANSIENT', `Worker ${path} ${reason}`);
    } finally {
      clearTimeout(timer);
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = undefined;
    }
    const body = record(parsed);

    if (response.ok) {
      // Gateway-style envelope: { statusCode, message, data }.
      const data = record(body?.data);
      if (data === undefined) {
        throw malformed();
      }
      return data;
    }
    throw this.mapError(path, response.status, body);
  }

  private mapError(
    path: string,
    status: number,
    body: Record<string, unknown> | undefined,
  ): ProcessingWorkerError {
    const code =
      typeof body?.code === 'string' && FAILURE_CODE.test(body.code)
        ? body.code
        : undefined;
    const message = `Worker ${path} answered ${status}${code === undefined ? '' : ` ${code}`}`;
    if (status === 401) {
      return new ProcessingWorkerError('UNAUTHORIZED', message, code);
    }
    if (status >= 500 || status === 408 || status === 429) {
      return new ProcessingWorkerError('TRANSIENT', message, code);
    }
    const fallback =
      status === 400
        ? 'INVALID_REQUEST'
        : status === 404
          ? 'OBJECT_NOT_FOUND'
          : 'PROCESSING_REJECTED';
    return new ProcessingWorkerError('DATA', message, code ?? fallback);
  }
}

function malformed(): ProcessingWorkerError {
  return new ProcessingWorkerError(
    'TRANSIENT',
    'Worker answered 200 with an unexpected body',
  );
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    throw malformed();
  }
  return value;
}

function workerObject(value: unknown): WorkerObject {
  const item = record(value);
  if (item === undefined) {
    throw malformed();
  }
  return { key: text(item.key), sha256: text(item.sha256) };
}

function outputs(value: unknown): WorkerOutputs {
  const item = record(value);
  if (item === undefined) {
    throw malformed();
  }
  return {
    vectorSvg: workerObject(item.vectorSvg),
    manifest: workerObject(item.manifest),
    ...(item.audioSegment === undefined
      ? {}
      : { audioSegment: workerObject(item.audioSegment) }),
  };
}

function file(value: unknown): WorkerFile {
  const item = record(value);
  if (item === undefined || typeof item.sizeBytes !== 'number') {
    throw malformed();
  }
  return {
    key: text(item.key),
    sha256: text(item.sha256),
    sizeBytes: item.sizeBytes,
  };
}

/** `wavecode.styles`: code -> files. Unset when the worker does not report it. */
function styleFiles(
  value: unknown,
): Record<string, WorkerStyleFiles> | undefined {
  const map = record(value);
  if (map === undefined) {
    return undefined;
  }
  const result: Record<string, WorkerStyleFiles> = {};
  for (const [code, files] of Object.entries(map)) {
    const item = record(files);
    if (item === undefined) {
      throw malformed();
    }
    result[code] = {
      vectorSvg: file(item.vectorSvg),
      alphaPng: file(item.alphaPng),
    };
  }
  return result;
}

function numbers(value: unknown): number[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'number')) {
    throw malformed();
  }
  return value;
}

function wavecode(value: unknown): WavecodeResult {
  const item = record(value);
  if (item === undefined || !Array.isArray(item.nudgeCandidates)) {
    throw malformed();
  }
  return {
    scheme: text(item.scheme),
    ...(typeof item.style === 'string' && item.style !== ''
      ? { style: item.style }
      : {}),
    ...(item.styles === undefined ? {} : { styles: styleFiles(item.styles) }),
    levels: numbers(item.levels),
    checkBars: numbers(item.checkBars),
    nudgeCandidates: item.nudgeCandidates.map(numbers),
  };
}
