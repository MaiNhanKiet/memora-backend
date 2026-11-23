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
| GET | `/v1/fingerprint/presets` | List the fingerprint frames (PERSO-036). |
| POST | `/v1/fingerprint/render-crop` | Cut a new design version from the stored base image (PERSO-038). |
| POST | `/v1/fingerprint/select-version` | Keep one version, delete the others and the base image (PERSO-039). |
| POST | `/v1/soundwave/process` | Audio → 3 s segment → `MEMORA_WAVECODE_v1` SVG + PNG. |
| POST | `/v1/soundwave/render-wavecode` | Re-render a WAVECODE from an exact level sequence (uniqueness nudge), or add another style for the same levels. |
| POST | `/v1/soundwave/select-wavecode-style` | Keep one generated style and delete the others (PERSO-034). |
| GET | `/v1/soundwave/presets` | List the selectable WAVECODE styles (PERSO-031). |

All bodies are JSON (`Content-Type: application/json`). Operations timeouts: 60 s for fingerprint, 90 s for
soundwave, 30 s for render, 10 s for presets.

### 2.0 Response envelope (same as the API Gateway)

Success is always HTTP `200` with `{ "statusCode": 200, "message": "...", "data": <payload> }`. The payloads
shown in 2.1 to 2.3 are the content of `data`. `/health` answers
`{ "statusCode": 200, "message": "OK", "data": { "status": "UP", "potrace": true, "ffmpeg": true, "storage": true } }`.

```json
{ "statusCode": 200, "message": "Fingerprint processed", "data": { "status": "READY", "processorVersion": "1.0.0" } }
```

Errors keep the HTTP status of section 3 and use `{ "statusCode", "code", "message", "path", "timestamp" }`
(`path` is the request path, `timestamp` is ISO 8601 UTC). Unknown routes and wrong methods use the same shape.

```json
{
  "statusCode": 422,
  "code": "IMAGE_UNREADABLE",
  "message": "The raw object is not a readable image.",
  "path": "/v1/fingerprint/process",
  "timestamp": "2026-11-23T08:15:30.123Z"
}
```

Optional header `X-Request-Id` (at most 100 characters, `[A-Za-z0-9_.:-]`): when present and valid the worker
echoes it as the response header `X-Request-Id` and writes it to its logs. It is never part of the body.
Operations sends `<sourceId>-<attempt>`.

### 2.1 `POST /v1/fingerprint/process`

Request:

```json
{
  "sourceId": "uuid",
  "rawKey": "personalization/fingerprint/{orderId}/sessions/{sessionId}/attempt-{attemptId}.bmp",
  "outputPrefix": "personalization/fingerprint/{orderId}/selected/{sourceId}/",
  "context": {
    "orderId": "uuid",
    "sessionId": "uuid",
    "attemptNo": 2,
    "ringItemIds": ["uuid"]
  }
}
```

`context` is optional (section 4.1): the worker copies it into `manifest.json` and ignores it otherwise.

`rawKey` is the accepted AS608 BMP stored by PERSO-007. The standard preset is used; there are no options in v1.

Response `200`:

```json
{
  "statusCode": 200,
  "message": "Fingerprint processed",
  "data": {
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
    "quality": { "score": 62.4, "message": "contrast ok" },
    "base": { "key": "…/base.png", "sha256": "hex", "sizeBytes": 0, "widthPx": 2048, "heightPx": 2048 },
    "version": {
      "versionId": "v0",
      "shape": "NATURAL",
      "offsetX": 0,
      "offsetY": 0,
      "zoom": 1,
      "erasedRatio": 0,
      "ridgeWidthRatio": 0.1,
      "minEngraveSizeMm": 7.0,
      "coverage": 0.93
    }
  }
}
```

Design versions (2026-11-23, PERSO-036..039): the response also carries `base` (the cleaned high-resolution image,
about 2048 px so a zoom of 3x stays sharp, written to `{outputPrefix}base.png`) and `version`, the default design
`v0` (`shape` `NATURAL`, no offset, zoom 1, nothing erased). `outputs.vectorSvg` / `outputs.alphaPng` are the v0 files at
`{outputPrefix}versions/v0/fingerprint.svg` and `.../fingerprint_alpha.png`. `ridgeWidthRatio` is the ridge width
relative to the frame, `minEngraveSizeMm` the smallest engraving size that keeps ridges at 0.07 mm or more, and
`coverage` the share of the frame covered by ridges (0..1). The worker drops solid blobs and blobs touching the image edge
or far from the main ridge region. Operations stores `base` and `version` in `metadata_json.artwork`; a worker that does
not send them leaves the artwork not editable (PERSO-038 answers 409 `ARTWORK_NOT_EDITABLE`).

- The artwork sits on a square canvas. `vectorSvg` uses `viewBox="0 0 1000 1000"` (unitless); the placement
  scales it to `width_mm` × `height_mm`. `alphaPng` is the same canvas, transparent background, ridges opaque.
- `artwork.hull` is the convex hull of the ridge pixels in normalized canvas coordinates (`0..1`, origin top-left,
  y down), at most 32 points. Placement validation (PERSO-017) checks this hull, not the square, against the
  surface boundary and forbidden zones.

#### 2.1.1 `GET /v1/fingerprint/presets`

No body; header `X-Memora-Worker-Secret`. Response `200`:

```json
{
  "statusCode": 200,
  "message": "Fingerprint presets",
  "data": {
    "defaultShape": "NATURAL",
    "shapes": [
      { "code": "NATURAL", "name": "Natural", "description": "Natural oval outline", "sampleSvg": "<svg ...>" }
    ]
  }
}
```

`code` is one of `NATURAL`, `CIRCLE`, `HEART`, `SQUARE` (rounded square). Operations caches the answer in memory for 10
minutes (serving a stale copy when the worker is down) and exposes it as `GET /api/v1/personalization/fingerprint/frames`
(PERSO-036). Timeout 10 s.

#### 2.1.2 `POST /v1/fingerprint/render-crop`

Request: `{ "sourceId", "outputPrefix", "versionId", "shape", "offsetX", "offsetY", "zoom", "eraseStrokes"?, "context"? }`
with `shape` one of the frame codes, `offsetX` / `offsetY` in -1..1, `zoom` in 1..3 and `eraseStrokes` at most 50 items
`{ "radius": 0.005..0.1, "points": [[x, y], ...] }` (at most 200 points, coordinates 0..1). Rotation is not applied
here; it stays in the ring placement step. The worker crops `{outputPrefix}base.png`, applies the erase strokes before
vectorising (the eraser only removes ink), and writes `{outputPrefix}versions/{versionId}/fingerprint.svg` and
`fingerprint_alpha.png` without touching other versions. Response `200` (inside `data`):

```json
{
  "status": "READY",
  "processorVersion": "1.0.0",
  "outputs": { "vectorSvg": {}, "alphaPng": {}, "manifest": {} },
  "artwork": { "aspectRatio": 1.0, "hull": [[0.12, 0.30]] },
  "version": {
    "versionId": "v0",
    "shape": "NATURAL",
    "offsetX": 0,
    "offsetY": 0,
    "zoom": 1,
    "erasedRatio": 0,
    "ridgeWidthRatio": 0.1,
    "minEngraveSizeMm": 7.0,
    "coverage": 0.93
  }
}
```

Errors: `422 ERASE_AREA_TOO_LARGE` (erased area over 15 % of the ridge area), `422 FRAME_COVERAGE_TOO_LOW` (coverage under
70 %), `404 OBJECT_NOT_FOUND` (no base image, for example after acceptance). Operations passes the two 422 codes to the
client as 422 with the same code and treats 404 as 409 `ARTWORK_NOT_EDITABLE`. Timeout 45 s.

#### 2.1.3 `POST /v1/fingerprint/select-version`

Request: `{ "sourceId", "outputPrefix", "versionId", "context"? }`. Deletes every other version's files **and**
`base.png`, rewrites `manifest.json` for the accepted version only, and is idempotent. Unknown `versionId`:
`422 VERSION_NOT_FOUND`. Response `200` (inside `data`): `{ "status": "READY", "processorVersion", "outputs": { "vectorSvg",
"alphaPng", "manifest" }, "version": { ... }, "deleted": ["…keys"] }`. Operations calls it after it has saved the accepted
version (PERSO-039); if it fails, the acceptance stays and the cleanup is retried the next time accept is called with the
same version. Timeout 30 s.

### 2.2 `POST /v1/soundwave/process`

Request:

```json
{
  "sourceId": "uuid",
  "rawKey": "personalization/soundwave/{orderId}/uploads/{sourceId}/raw.mp3",
  "outputPrefix": "personalization/soundwave/{orderId}/selected/{sourceId}/",
  "contentType": "audio/mpeg",
  "declaredDurationMs": 12400,
  "segmentStartMs": 4200,
  "segmentDurationMs": 3000,
  "style": "CLASSIC",
  "context": { "orderId": "uuid", "ringItemIds": ["uuid"] }
}
```

`style` is optional (`CLASSIC` | `HAIRLINE` | `OSCILLOSCOPE`, default `CLASSIC`); an unknown value answers
`400 INVALID_REQUEST`. Operations sends the style the customer chose at PERSO-010 (`metadata_json.wavecodeStyle`).

Request limits (violations answer `400 INVALID_REQUEST`): `contentType` is one of `audio/wav`, `audio/mpeg`,
`audio/mp4`, `audio/aac`; `declaredDurationMs` is 3000..30000; `segmentStartMs` is 0..27000.

Checks, in order: the audio decodes (FFmpeg for compressed formats); the measured duration is 3000..30000 ms
and within 250 ms of `declaredDurationMs`; `segmentStartMs + 3000` ≤ measured duration.

Response `200`:

```json
{
  "statusCode": 200,
  "message": "Soundwave processed",
  "data": {
    "status": "READY",
    "processorVersion": "1.0.0",
    "measuredDurationMs": 12387,
    "outputs": {
      "vectorSvg":    { "key": "…/wavecode-classic.svg", "sha256": "hex", "sizeBytes": 0, "contentType": "image/svg+xml" },
      "alphaPng":     { "key": "…/wavecode-classic_alpha.png", "sha256": "hex", "sizeBytes": 0, "contentType": "image/png", "widthPx": 2125, "heightPx": 500 },
      "audioSegment": { "key": "…/audio_segment.wav", "sha256": "hex", "sizeBytes": 0, "contentType": "audio/wav" },
      "manifest":     { "key": "…/manifest.json", "sha256": "hex", "sizeBytes": 0, "contentType": "application/json" }
    },
    "wavecode": {
      "scheme": "MEMORA_WAVECODE_v1",
      "style": "CLASSIC",
      "styles": {
        "CLASSIC": {
          "vectorSvg": { "key": "…/wavecode-classic.svg", "sha256": "hex", "sizeBytes": 0, "contentType": "image/svg+xml" },
          "alphaPng":  { "key": "…/wavecode-classic_alpha.png", "sha256": "hex", "sizeBytes": 0, "contentType": "image/png", "widthPx": 2125, "heightPx": 500 }
        }
      },
      "levels": [3, 5, 6, 4, 2, 1, 4, 6, 7, 5, 3, 2, 4, 5, 6, 3, 2, 1],
      "checkBars": [5, 5],
      "bars": [7, 3, 5, 6, 4, 2, 1, 4, 6, 7, 5, 7, 5, 3, 2, 4, 5, 6, 3, 2, 1, 5, 7],
      "nudgeCandidates": [[3, 5, 6, 4, 2, 1, 4, 6, 7, 5, 3, 2, 4, 5, 6, 3, 2, 2]]
    }
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
  `vectorSvg` uses these mm values as SVG user units on the template's fixed engraving rectangle: `viewBox="0 0 8.5 2.0"`,
  `width="8.5mm" height="2.0mm"`. The 23-bar code (22 × 0.3696 + 0.16 = 8.2912 mm wide) is centred horizontally
  (offset (8.5 − 8.2912) / 2) and vertically on y = 1.0. A thin centre line (0.08 mm high, rounded ends, from the left
  edge of bar 0 to the right edge of bar 22) is added so the code reads like a waveform. `alphaPng` is 2125 × 500 px
  (250 px/mm, same 8.5 : 2.0 aspect), transparent background, opaque black shapes. The encoding is unchanged.
- `nudgeCandidates`: ordered alternatives for uniqueness, each changing one data bar by ±1 level, starting with the
  bar closest to a quantization boundary; at most 8. Operations picks the first sequence not used by another
  non-deleted SOUNDWAVE source and, when it is not `levels`, calls `render-wavecode`.

### 2.3 `POST /v1/soundwave/render-wavecode`

Request: `{ "sourceId", "outputPrefix", "levels": [18 ints 0..7], "style"?, "context"? }` (`style` as in 2.2, default `CLASSIC`). Response `200` (inside `data`): same `outputs` (without
`audioSegment`, which is unchanged) and `wavecode` (including `style`) for the given levels, with `nudgeCandidates: []`.

Per-style behaviour (2026-11-23): when a style with the same `levels` was already generated for this `outputPrefix`, the
worker reuses it (`"reused": true`, no new files); otherwise it adds that style's files and leaves the other styles
untouched. `outputs.vectorSvg` / `outputs.alphaPng` are the requested style's files and `wavecode.styles` lists every
generated style (code to `{ vectorSvg, alphaPng }`, each with `key`, `sha256`, `sizeBytes`, `contentType`; the PNG also
`widthPx` / `heightPx`). `POST /v1/soundwave/process` answers the same way with one entry in `wavecode.styles`.
Operations stores this map in `metadata_json.wavecode.styles` (PERSO-032..034).

### 2.4 `GET /v1/soundwave/presets`

No body; header `X-Memora-Worker-Secret` as for every `/v1` call. Response `200`:

```json
{
  "statusCode": 200,
  "message": "Soundwave presets",
  "data": {
    "defaultStyle": "CLASSIC",
    "styles": [
      {
        "code": "CLASSIC",
        "name": "Classic",
        "description": "Bars with a thin centre line",
        "decoder": "BAR_HEIGHT",
        "sampleSvg": "<svg ...>"
      }
    ]
  }
}
```

`code` is one of `CLASSIC`, `HAIRLINE`, `OSCILLOSCOPE`; `decoder` is `BAR_HEIGHT` or `PEAK_HEIGHT`; `sampleSvg` is a small
preview SVG document. Operations caches the answer in memory for 10 minutes and serves it from `GET
/api/v1/personalization/soundwave/styles` (PERSO-031). The three codes are also a fixed list in Operations: PERSO-010
validates `wavecodeStyle` against it and never calls the worker for that.

#### Styles (encoding `MEMORA_WAVECODE_v1` unchanged in all three)

| Code | Drawing | Decoder |
|---|---|---|
| `CLASSIC` | Bars 0.16 mm wide plus the thin centre line (0.08 mm). | `BAR_HEIGHT` |
| `HAIRLINE` | Bars 0.10 mm wide, no centre line. | `BAR_HEIGHT` |
| `OSCILLOSCOPE` | One alternating polyline, stroke 0.09 mm, through the bar peaks. | `PEAK_HEIGHT` |

The levels, check bars, reference bars, canvas (8.5 × 2.0 mm) and nudge candidates do not depend on the style, so WAVECODE
uniqueness in Operations compares levels only. `manifest.json` records `wavecode.style`.

### 2.5 `POST /v1/soundwave/select-wavecode-style`

Request: `{ "sourceId", "outputPrefix", "style", "context"? }`. Deletes the files of every other style, rewrites
`manifest.json` so it lists the accepted style only, and is idempotent (repeating it deletes nothing more). A style that was
never generated answers `422 STYLE_NOT_GENERATED`. Response `200` (inside `data`):

```json
{
  "status": "READY",
  "processorVersion": "1.0.0",
  "outputs": { "vectorSvg": { "key": "…" }, "alphaPng": { "key": "…" }, "manifest": { "key": "…" } },
  "wavecode": { "style": "HAIRLINE", "styles": { "HAIRLINE": { "vectorSvg": {}, "alphaPng": {} } } },
  "deleted": ["…/wavecode-classic.svg", "…/wavecode-classic_alpha.png"]
}
```

Operations calls it after it has saved the accepted style (PERSO-034). If the call fails, the acceptance stays and the
cleanup is retried the next time accept is called with the same style. Timeout 30 s.

## 3. Errors

Non-`200` responses use the error envelope of section 2.0; `code` carries the value below.

| HTTP | `code` | Operations action |
|---|---|---|
| 400 | `INVALID_REQUEST` | Fail at once (`PROCESSING_FAILED`), log as a bug. |
| 401 | `UNAUTHORIZED` | Fail the job, alert: secret mismatch. |
| 404 | `OBJECT_NOT_FOUND` | Fail at once. |
| 422 | `IMAGE_UNREADABLE`, `FINGERPRINT_REGION_NOT_FOUND`, `AUDIO_UNREADABLE`, `AUDIO_DURATION_INVALID`, `SEGMENT_OUT_OF_RANGE`, `STYLE_NOT_GENERATED`, `ERASE_AREA_TOO_LARGE`, `FRAME_COVERAGE_TOO_LOW`, `VERSION_NOT_FOUND` | Fail at once; the code goes to `metadata_json.failureCode` (during processing). For PERSO-033/034 any worker failure is answered 503 `PROCESSING_WORKER_UNAVAILABLE`. |
| 404 | `NOT_FOUND` (unknown route) | Fail at once, log as a bug. |
| 405 | `METHOD_NOT_ALLOWED` | Fail at once, log as a bug. |
| 503 | `STORAGE_UNAVAILABLE`, `TOOL_UNAVAILABLE` | Transient: retry. |
| 500 | `INTERNAL_ERROR`, `CONFIG_ERROR` | Transient: retry (details are never exposed). |
| 5xx / timeout / connection error | — | Transient: retry 3 times (30 s, 2 min, 8 min), then `WORKER_UNAVAILABLE`. |

## 4. Output layout and idempotency

Object keys are organized by package, then order, then session or source (user-approved 2026-11-23):

```
personalization/
  fingerprint/{orderId}/sessions/{sessionId}/attempt-{attemptId}.bmp   raw AS608 image per attempt (rows keep their stored key)
  fingerprint/{orderId}/selected/{sourceId}/                           base.png, versions/{versionId}/fingerprint.svg + fingerprint_alpha.png (v0, v1, ...), manifest.json
  soundwave/{orderId}/uploads/{sourceId}/raw.{wav|mp3|m4a|aac}         customer upload
  soundwave/{orderId}/selected/{sourceId}/                             wavecode-{style}.svg, wavecode-{style}_alpha.png per generated style (style lower-case: classic, hairline, oscilloscope), audio_segment.wav, manifest.json
```

`outputPrefix` is the `selected/{sourceId}/` folder. Operations resolves `orderId` from the source (consent, then active
binding, then capture session); with none, the job fails as `PROCESSING_FAILED` / `SOURCE_INVALID`.

#### 4.1 `context` (optional)

`{ "orderId": uuid, "sessionId": uuid (fingerprint only), "attemptNo": 1..3 (fingerprint only), "ringItemIds": uuid[] (max 2) }`.
The worker validates the limits, copies the object into `manifest.json` as `context`, and never uses it for paths.
Older workers ignore the field.

- Every output key is `outputPrefix + fixed file name`. Repeating a request overwrites the same keys, so a retry
  never leaves extra objects.
- `manifest.json` lists every output (key, sha256, size, content type, pixel size), `processorVersion`, the
  request inputs (without secrets) and, for fingerprints, `artwork.hull`; for soundwave, the final `wavecode`.
- Operations writes `processed_asset_key` = manifest key, `vector_asset_key` + `vector_checksum` = the SVG, and keeps
  `artwork` / `wavecode` / `measuredDurationMs` / `processorVersion` in `personalization_sources.metadata_json`.
- A result for a source that is no longer `PROCESSING` is ignored by Operations.

## 5. Clarifications (v1, 2026-11-19, from the first worker implementation)

1. `outputPrefix` must end with `/`; keys containing `..`, `\` or starting with `/` are rejected with `400 INVALID_REQUEST`.
   `rawKey` and `outputPrefix` must also start with `personalization/` and be at most 1024 characters.
2. `segmentDurationMs` must be exactly `3000`.
3. `manifest.json` lists every output except itself; its own sha256 is only in the response (`outputs.manifest`).
4. `render-wavecode` writes the requested style's `wavecode-{style}.svg`, `wavecode-{style}_alpha.png` and `manifest.json` (other styles are not touched; the old `wavecode.svg` / `wavecode_alpha.png` names are gone). It keeps `audioSegment`,
   `measuredDurationMs` and the original request from the previous manifest and adds `renderedFromLevels: true`.
5. `quality.message` is English free text. A low score never fails the job; the staff already chose the image.
6. Nudge candidates: each data bar may give a `+1` and a `-1` candidate (kept inside 0..7), ordered by the distance of
   its pre-quantization value to the boundary in that direction (`level ± 0.5`), closest first; at most 8.
7. Hull points use pixel centres, `(x + 0.5) / 1024`, rounded to 4 decimals.
8. Unexpected errors: `500 INTERNAL_ERROR` (Operations treats any 5xx as transient). `/health` always answers `200`
   with `data.potrace`, `data.ffmpeg` and `data.storage` flags. No OpenAPI/docs endpoints are exposed.
9. `measuredDurationMs = round(samples / sampleRate * 1000)`; the 3000..30000 range is inclusive.
10. Envelope (2026-11-23): the worker mirrors the API Gateway envelope (`statusCode` / `message` / `data` on success,
    `statusCode` / `code` / `message` / `path` / `timestamp` on error). The earlier `status: FAILED` / `failureCode`
    error body is gone; the success payload keeps `status: "READY"` inside `data`.
11. WAVECODE rendering (2026-11-23): only the drawing changed, not `MEMORA_WAVECODE_v1`. The canvas is the template's
    fixed 8.5 × 2.0 mm rectangle; the SVG has one `<g fill="#000">` (no stroke, gradient, opacity, filter or transform),
    a `<title>MEMORA_WAVECODE_v1</title>` and `data-levels` (the 18 levels). The centre line (0.08 mm) is thinner than the
    smallest bar (0.4 mm), so bar heights measured against the reference bars still decode the same.
    `alphaPng.widthPx` / `heightPx` are `2125` / `500`.
