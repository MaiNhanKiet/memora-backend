# Personalization processing worker — HTTP contract v1

Status: PROPOSED with PERSO-013 (approved 2026-11-19, D-P-19). This file is the contract between
Operations (caller) and the service `services/personalization_worker` in the separate repository
`memora-python-services` (implementer). That repository holds one folder, requirements file, Dockerfile and image
per Python service (LightRAG comes later as its own service under an Experience plan).
Change it here first; a breaking change needs a new path version (`/v2`).

## 1. Deployment and trust

| Item | Rule |
|---|---|
| Image | Private GHCR image `memora-personalization-worker`, built from `services/personalization_worker` by the repository's CI, pinned by version tag (never `latest`). |
| Network | Compose project of `memora-python-services` on the Mini PC (one container per service), joins the external `memora-network`. No host port, no tunnel route. |
| Base URL | Operations env `OPERATIONS_PROCESSING_WORKER_URL`, for example `http://memora-personalization-worker:8010`. |
| Auth | Header `X-Memora-Worker-Secret: <secret>` on every `/v1` call. Operations env `OPERATIONS_PROCESSING_WORKER_SECRET`, worker env `WORKER_SHARED_SECRET`. The worker compares in constant time and answers `401` on mismatch. `/health` needs no secret. |
| Storage | Garage through the S3 API with its **own access key**, read/write on the personalization bucket only. Object keys in, object keys out. No presigned or public URLs. |
| State | Stateless. No database, no queue, no Order/Consent/Commerce access. Temporary files are deleted after each request. |
| Logs | Never log audio, images, vectors or secrets. Logging `sourceId` and object keys is allowed. |

## 2. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness, plus `potrace`, `ffmpeg` and storage reachability. |
| POST | `/v1/fingerprint/process` | Fingerprint image → laser SVG + preview PNG. |
| POST | `/v1/soundwave/process` | Audio → 3 s segment → `MEMORA_WAVECODE_v1` SVG + PNG. |
| POST | `/v1/soundwave/render-wavecode` | Re-render a WAVECODE from an exact level sequence (uniqueness nudge). |

All bodies are JSON (`Content-Type: application/json`). Operations timeouts: 60 s for fingerprint, 90 s for
soundwave, 30 s for render.

### 2.1 `POST /v1/fingerprint/process`

Request:

```json
{
  "sourceId": "uuid",
  "rawKey": "personalization/fingerprint/raw/{sessionId}/{attemptId}",
  "outputPrefix": "personalization/sources/{sourceId}/"
}
```

`rawKey` is the accepted AS608 BMP stored by PERSO-007. The standard preset is used; there are no options in v1.

Response `200`:

```json
{
  "status": "READY",
  "processorVersion": "1.0.0",
  "outputs": {
    "vectorSvg": { "key": "…/fingerprint.svg", "sha256": "hex", "sizeBytes": 0, "contentType": "image/svg+xml" },
    "alphaPng":  { "key": "…/fingerprint_alpha.png", "sha256": "hex", "sizeBytes": 0, "contentType": "image/png", "widthPx": 1024, "heightPx": 1024 },
    "manifest":  { "key": "…/manifest.json", "sha256": "hex", "sizeBytes": 0, "contentType": "application/json" }
  },
  "artwork": {
    "aspectRatio": 1.0,
    "hull": [[0.12, 0.30], [0.50, 0.07], [0.88, 0.31], [0.86, 0.72], [0.50, 0.93], [0.14, 0.70]]
  },
  "quality": { "score": 62.4, "message": "contrast ok" }
}
```

- The artwork sits on a square canvas. `vectorSvg` uses `viewBox="0 0 1000 1000"` (unitless); the placement
  scales it to `width_mm` × `height_mm`. `alphaPng` is the same canvas, transparent background, ridges opaque.
- `artwork.hull` is the convex hull of the ridge pixels in normalized canvas coordinates (`0..1`, origin top-left,
  y down), at most 32 points. Placement validation (PERSO-017) checks this hull, not the square, against the
  surface boundary and forbidden zones.

### 2.2 `POST /v1/soundwave/process`

Request:

```json
{
  "sourceId": "uuid",
  "rawKey": "personalization/sources/{sourceId}/raw",
  "outputPrefix": "personalization/sources/{sourceId}/",
  "contentType": "audio/mpeg",
  "declaredDurationMs": 12400,
  "segmentStartMs": 4200,
  "segmentDurationMs": 3000
}
```

Checks, in order: the audio decodes (FFmpeg for compressed formats); the measured duration is 3000..30000 ms
and within 250 ms of `declaredDurationMs`; `segmentStartMs + 3000` ≤ measured duration.

Response `200`:

```json
{
  "status": "READY",
  "processorVersion": "1.0.0",
  "measuredDurationMs": 12387,
  "outputs": {
    "vectorSvg":    { "key": "…/wavecode.svg", "sha256": "hex", "sizeBytes": 0, "contentType": "image/svg+xml" },
    "alphaPng":     { "key": "…/wavecode_alpha.png", "sha256": "hex", "sizeBytes": 0, "contentType": "image/png", "widthPx": 2048, "heightPx": 512 },
    "audioSegment": { "key": "…/audio_segment.wav", "sha256": "hex", "sizeBytes": 0, "contentType": "audio/wav" },
    "manifest":     { "key": "…/manifest.json", "sha256": "hex", "sizeBytes": 0, "contentType": "application/json" }
  },
  "wavecode": {
    "scheme": "MEMORA_WAVECODE_v1",
    "levels": [3, 5, 6, 4, 2, 1, 4, 6, 7, 5, 3, 2, 4, 5, 6, 3, 2, 1],
    "checkBars": [5, 5],
    "bars": [7, 3, 5, 6, 4, 2, 1, 4, 6, 7, 5, 7, 5, 3, 2, 4, 5, 6, 3, 2, 1, 5, 7],
    "nudgeCandidates": [[3, 5, 6, 4, 2, 1, 4, 6, 7, 5, 3, 2, 4, 5, 6, 3, 2, 2]]
  }
}
```

`MEMORA_WAVECODE_v1` (from `memora-3d/BAR_001_SW/BAR_001_SW_template.json`):

- 23 bars: reference bars at positions 0, 11 and 22 at the max level (7); check bars at positions 10 and 21;
  positions 1..9 carry `levels[0..8]` and positions 12..20 carry `levels[9..17]`. Example above:
  `c = 621 mod 64 = 45`, so the check bars are 5 and 5.
- `levels`: RMS envelope of the 3 s segment split into 18 equal windows, normalized, quantized to 8 levels (0..7).
- `checkBars`: `c = sum((i + 1) * levels[i] for i in 0..17) mod 64`, bar A = `c // 8`, bar B = `c % 8`.
- Geometry in mm, from the template: bar width 0.16, pitch 0.3696, rounded ends, level heights
  `[0.4, 0.6286, 0.8571, 1.0857, 1.3143, 1.5429, 1.7714, 2.0]`, bars mirrored about the centre line.
  `vectorSvg` uses these mm values as SVG user units (`viewBox` width = 22 × 0.3696 + 0.16 = 8.2912, height 2.0).
- `nudgeCandidates`: ordered alternatives for uniqueness, each changing one data bar by ±1 level, starting with the
  bar closest to a quantization boundary; at most 8. Operations picks the first sequence not used by another
  non-deleted SOUNDWAVE source and, when it is not `levels`, calls `render-wavecode`.

### 2.3 `POST /v1/soundwave/render-wavecode`

Request: `{ "sourceId", "outputPrefix", "levels": [18 ints 0..7] }`. Response `200`: same `outputs` (without
`audioSegment`, which is unchanged) and `wavecode` for the given levels, with `nudgeCandidates: []`.

## 3. Errors

Non-`200` responses use `{ "status": "FAILED", "failureCode": "…", "message": "…" }`.

| HTTP | `failureCode` | Operations action |
|---|---|---|
| 400 | `INVALID_REQUEST` | Fail at once (`PROCESSING_FAILED`), log as a bug. |
| 401 | `UNAUTHORIZED` | Fail the job, alert: secret mismatch. |
| 404 | `OBJECT_NOT_FOUND` | Fail at once. |
| 422 | `IMAGE_UNREADABLE`, `FINGERPRINT_REGION_NOT_FOUND`, `AUDIO_UNREADABLE`, `AUDIO_DURATION_INVALID`, `SEGMENT_OUT_OF_RANGE` | Fail at once; the code goes to `metadata_json.failureCode`. |
| 503 | `STORAGE_UNAVAILABLE`, `TOOL_UNAVAILABLE` | Transient: retry. |
| 5xx / timeout / connection error | — | Transient: retry 3 times (30 s, 2 min, 8 min), then `WORKER_UNAVAILABLE`. |

## 4. Output layout and idempotency

- Every output key is `outputPrefix + fixed file name`. Repeating a request overwrites the same keys, so a retry
  never leaves extra objects.
- `manifest.json` lists every output (key, sha256, size, content type, pixel size), `processorVersion`, the
  request inputs (without secrets) and, for fingerprints, `artwork.hull`; for soundwave, the final `wavecode`.
- Operations writes `processed_asset_key` = manifest key, `vector_asset_key` + `vector_checksum` = the SVG, and keeps
  `artwork` / `wavecode` / `measuredDurationMs` / `processorVersion` in `personalization_sources.metadata_json`.
- A result for a source that is no longer `PROCESSING` is ignored by Operations.
