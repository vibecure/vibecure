# Future AI Service Types

Service types not yet supported by VibeCure that are candidates for scope expansion. Each entry includes provider names, cost profiles, primary attack vectors, which core checks apply, and estimated implementation effort.

All services would fall under the LLM domain umbrella for core controls.

---

## Core Check Applicability Matrix

| Check | LLM Text | Speech (STT) | TTS | Image Gen | Video Gen | Embeddings |
|-------|----------|--------------|-----|-----------|-----------|------------|
| **no-rate-limit** | yes | yes | yes | yes | yes | yes |
| **no-captcha** | yes | yes | yes | yes | yes | yes |
| **no-quota** | yes | yes (audio mins) | yes (chars) | yes (images) | yes (videos) | yes (tokens) |
| **suggest-add-auth** | yes | yes | yes | yes | yes | yes |
| **no-input-validation** | yes (text) | via file checks | yes (text len) | yes (prompt) | yes (prompt) | yes (batch size) |
| **no-max-tokens** | yes | N/A | N/A | yes (n + size) | N/A | N/A |
| **no-file-size-limit** | N/A | yes | N/A | conditional | conditional | N/A |
| **no-file-duration-limit** | N/A | yes | N/A | N/A | N/A | N/A |
| **no-file-type-validation** | N/A | yes | N/A | conditional | conditional | N/A |

**Why no-max-tokens doesn't apply to some services:**

| Service | Cost driver | Controlled by |
|---------|-------------|---------------|
| STT | Audio duration (per minute) | File size + duration limits |
| TTS | Input character count | Input validation (text length IS the cost cap) |
| Video Gen | Output duration + resolution | Would need video-gen-specific param check |
| Embeddings | Input tokens x batch size | Input validation (batch size + text length) |

---

## Text-to-Speech (TTS)

**Priority**: HIGH

**Providers & npm packages:**
- ElevenLabs (`elevenlabs`)
- Google Cloud TTS (`@google-cloud/text-to-speech`)
- AWS Polly (`@aws-sdk/client-polly`, `aws-sdk` with Polly)
- Azure Speech (`microsoft-cognitiveservices-speech-sdk`)

**Cost profile:**

| Service | Voice tier | Price per 1M characters | Max daily burn |
|---------|-----------|------------------------|---------------|
| Google Cloud TTS | Standard | $4 | Low |
| Google Cloud TTS | Studio | $160 | $10,000+ |
| AWS Polly | Standard | $4.80 | Low |
| AWS Polly | Long-Form | $100 | $10,000+ |
| ElevenLabs | Professional | ~$30-50 effective | Credit-based |

**Primary attack vector**: Premium voice tier abuse. The cost spread between standard and studio/long-form voices is 20-40x. An attacker who can select the voice tier via API params burns costs at the premium rate.

**Service-specific checks needed:**
- Voice tier restriction: Validate that user-selected voice ID maps to an allowed tier. Don't expose premium/studio/long-form voices to unauthenticated or free-tier endpoints
- Text length cap (via no-input-validation): Character count is the direct cost driver. Cap at 5,000-10,000 chars/request
- Speech Marks double-billing awareness (AWS Polly): Each Speech Marks request is billed identically to synthesis — flag if both are called per user request

**Implementation effort**: ~30-40 lines SKILL.md + ~20 lines FIXES.md. Detection signatures are straightforward (npm package imports). Reuses all 4 universal checks. Needs voice tier restriction as a new service-specific check.

**Fit**: Excellent. Same patterns as existing domains.

---

## Image Generation

**Priority**: HIGH

**Providers & npm packages:**
- OpenAI DALL-E / GPT Image (`openai` — `images.generate`)
- Google Imagen (`@google-cloud/vertexai`, `@google/generative-ai`)
- Stability AI (via `stability-sdk` or Replicate)
- Replicate (`replicate`)

**Cost profile:**

| Service | Model | Cost per image | Max daily burn |
|---------|-------|---------------|---------------|
| OpenAI | GPT Image 1 (HD, 1536x1024) | $0.167 | ~$1,700 |
| OpenAI | DALL-E 3 (HD, 1792x1024) | $0.120 | ~$1,200 |
| Google | Imagen 4 Ultra | $0.060 | ~$600 |
| Stability AI | Various | $0.02-0.06 | ~$600 |

**Primary attack vector**: Max resolution + quality flooding. Attackers request HD quality at maximum resolution with maximum image count (`n`) per request.

**Service-specific checks needed:**
- Image count (`n`) cap: Already partially in no-max-tokens as special case. Would expand to full check
- Resolution/quality restriction: Validate `size` and `quality` params against allowed values per user tier
- Reference image file validation (img2img): If endpoint accepts reference images, apply file-size-limit and file-type-validation (`image/*`)

**Implementation effort**: ~20-30 lines SKILL.md (expand existing image gen special case to full check set) + ~15 lines FIXES.md. Detection requires matching `images.generate` patterns per provider.

**Fit**: Excellent. no-max-tokens already has an image gen special case — this would promote it to first-class support.

---

## Video Generation

**Priority**: MEDIUM

**Providers & npm packages:**
- Runway ML (`@runwayml/sdk`)
- Luma AI (`lumaai`)
- Kling AI (API-based, no established npm package)

**Cost profile:**

| Service | Cost per 10s video | Max daily burn |
|---------|--------------------|---------------|
| Runway ML (Gen-3/Gen-4) | $0.50 | $500+ per 1000 generations |

**Primary attack vector**: Highest per-request cost of any AI service ($0.50/10s). Even modest request volume is expensive.

**Service-specific checks needed:**
- Duration parameter cap: Validate `duration` param doesn't exceed allowed maximum
- Resolution restriction: Validate `ratio`/resolution against allowed values
- Strict per-user generation caps: e.g., 10 videos/day — video is too expensive for generous limits
- Concurrency limit per user: 1-2 concurrent generations max

**Implementation effort**: ~25-35 lines SKILL.md + ~15 lines FIXES.md. Lower provider ecosystem maturity — fewer npm packages to match.

**Fit**: Good. Universal checks apply cleanly. Duration/resolution param validation is analogous to image gen size/quality.

---

## Embeddings

**Priority**: LOW

**Providers & npm packages:**
- OpenAI (`openai` — `embeddings.create`)
- Cohere (`cohere-ai`)
- Google Vertex AI (`@google-cloud/vertexai`)
- Voyage AI (`voyageai`)

**Cost profile:**

| Service | Model | Price per 1M tokens | Notes |
|---------|-------|--------------------|----|
| OpenAI | text-embedding-3-small | $0.02 | Cheap per unit |
| OpenAI | text-embedding-3-large | $0.13 | 6.5x small |
| Cohere | embed-v4.0 | $0.10 | |

**Primary attack vector**: High-volume batch abuse. Embeddings are cheap per call but designed for massive throughput. One request can batch 100 texts x 8K tokens each = 800K tokens. At 3000 RPM, theoretical max is $449K/day (unlikely in practice).

**Service-specific checks needed:**
- Batch size cap (via no-input-validation): Limit array length on batch embedding requests
- Text length cap per item (via no-input-validation): Cap individual text length within the batch
- Token-based quota rather than request-based: One request with 100 texts =/= one request with 1 text

**Implementation effort**: ~15-20 lines SKILL.md + ~10 lines FIXES.md. Detection via `embeddings.create` / `embed()` patterns. Most controls are refinements of existing no-input-validation.

**Fit**: Moderate. Cheap per unit means EDoS risk is lower. Main value is for apps that expose embedding endpoints directly to users (rare).

---

## AI Agent Frameworks

**Priority**: FUTURE (evaluate separately)

**Frameworks & npm packages:**
- LangChain (`langchain`, `@langchain/core`)
- LlamaIndex (`llamaindex`)
- CrewAI (Python-primary, limited Node.js)
- AutoGen (Python-primary)
- Vercel AI SDK (`ai`)

**Cost profile:**

| Incident type | Cost | Duration |
|--------------|------|----------|
| Multi-agent recursive loop | $47,000 | 11 days undetected |
| 50-thread agent swarm | $9,000/hr | Continuous |
| Clawdrain trojanized skill | 6-7x token amplification | Per execution |

**Primary attack vectors:**
- Infinite loops: Agent "verify and retry" logic that never converges
- Token budget exhaustion: No per-execution token cap
- Execution timeout absence: Agents run indefinitely
- Cascading multi-agent chains: Each agent triggers N more agents

**Service-specific checks needed:**
- Iteration/step limits: Cap agent loops at N iterations
- Per-execution token budget: Kill agent when cumulative tokens exceed threshold
- Execution timeout: Hard timeout (e.g., 120 seconds)
- Circuit breakers: Monitor hourly spend per user, auto-disable above threshold

**Implementation effort**: ~40-60 lines SKILL.md + ~30 lines FIXES.md. HIGH complexity — agent patterns are extremely varied across frameworks. Detection reliability is the main concern.

**Fit**: Challenging. Framework detection is feasible (import matching). But agent loop patterns are highly diverse — PASS/FAIL criteria would need to be broad, increasing FP/FN risk. Recommend building as a separate evaluation pass rather than integrating into the current check catalog flow.

**Recommendation**: Defer until agent framework usage in vibe-coded backends is more prevalent and patterns stabilize. Focus on TTS and Image Gen first — they follow the proven "paid API endpoint" pattern that VibeCure handles well.
