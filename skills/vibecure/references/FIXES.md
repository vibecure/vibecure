# Fix Templates & Business Questions

Code patterns for each EDoS finding. Apply with the Edit tool after asking relevant business questions.

---

## Rate limiting

**Install**: `express-rate-limit`

**Thresholds by domain** (based on cost per API call):

| Domain | Window | Max | Cost rationale |
|--------|--------|-----|----------------|
| SMS | 15 min | 5 | $0.01–$0.50 per SMS |
| Email | 15 min | 10 | $0.0001–$0.002 per email + reputation |
| LLM | 1 min | 10 | $0.002–$0.10+ per call |
| Speech | 15 min | 5 | $0.006–$0.048 per minute of audio |

**For authenticated endpoints**: Use per-user keying:

```javascript
const rateLimit = require('express-rate-limit');

const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.user.id,  // Per-user, not per-IP
  message: { error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-code', authenticate, smsLimiter, async (req, res) => { ... });
```

**For unauthenticated endpoints**: Use per-IP keying (default):

```javascript
const rateLimit = require('express-rate-limit');

const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // Strict — no auth means anyone can hit this
  message: { error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-code', smsLimiter, async (req, res) => { ... });
```

If 3+ endpoints need rate limiting, extract to a shared middleware file.

---

## CAPTCHA

**Default**: Cloudflare Turnstile (free, invisible).

**Business question**: "For bot protection, Cloudflare Turnstile (free, invisible) is the default. Want a different provider?"

Only apply to **unauthenticated** endpoints that trigger paid API calls.

```javascript
async function verifyCaptcha(req, res, next) {
  const token = req.body.captchaToken || req.headers['x-captcha-token'];
  if (!token) return res.status(403).json({ error: 'CAPTCHA required' });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  });
  const data = await response.json();
  if (!data.success) return res.status(403).json({ error: 'CAPTCHA verification failed' });
  next();
}

router.post('/send-code', verifyCaptcha, smsLimiter, async (req, res) => { ... });
```

**Env var**: Add `TURNSTILE_SECRET_KEY` to `.env`.

---

## Registration protection

**No business question needed** — all three layers are industry standard.

Apply all three controls to the registration endpoint:

**Step 1: Rate limiting + CAPTCHA** — use existing templates (unauthenticated per-IP rate limiter, max 10/15min + Turnstile middleware).

**Step 2: Email verification gate** — create accounts in unverified state, send verification email using the app's detected email provider, block paid features until verified.

```javascript
const crypto = require('crypto');

// --- Registration handler ---
// Middleware chain: registrationLimiter → verifyCaptcha → handler
router.post('/register', registrationLimiter, verifyCaptcha, async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Create unverified account
  const user = await User.create({
    email,
    password: hashedPassword,
    emailVerified: false,
    verificationToken,
  });

  // Send verification email (use the app's email provider)
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    html: `<a href="${process.env.APP_URL}/verify-email?token=${verificationToken}">Verify your email</a>`,
  });

  res.status(201).json({ message: 'Check your email to verify your account.' });
});

// --- Verification endpoint ---
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({ where: { verificationToken: token } });
  if (!user) return res.status(400).json({ error: 'Invalid or expired token.' });

  user.emailVerified = true;
  user.verificationToken = null;
  await user.save();

  res.json({ message: 'Email verified.' });
});

// --- Gate middleware — add to all paid API routes ---
function requireVerifiedEmail(req, res, next) {
  if (!req.user.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email first.' });
  }
  next();
}

// Apply to paid routes
router.post('/api/send', authenticate, requireVerifiedEmail, checkQuota, async (req, res) => { ... });
```

**Schema change**: Add `emailVerified` (boolean, default false) and `verificationToken` (string, nullable) to the users table/model.

**When no paid services are integrated**: Skip the email verification gate — rate limiting + CAPTCHA are sufficient.

---

## Per-user quota

**Business question**: "What's a reasonable daily limit for [resource] per user?"

**Defaults**: SMS OTP: 10/day. Emails: 50/day. LLM calls: 100/day. Speech: 60 audio-minutes/day.

```javascript
// In-memory quota (replace with DB for production)
const userQuotas = new Map();
const DAILY_SMS_LIMIT = 10;

function checkSmsQuota(req, res, next) {
  const userId = req.user?.id || req.body.phone;
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:sms:${today}`;
  const count = userQuotas.get(key) || 0;

  if (count >= DAILY_SMS_LIMIT) {
    return res.status(429).json({ error: 'Daily SMS limit reached' });
  }

  userQuotas.set(key, count + 1);
  next();
}
```

**DB-backed version** (for production):

```javascript
// After successful API call:
await db.query(
  `INSERT INTO usage_tracking (user_id, resource_type, count, period_start)
   VALUES (?, ?, 1, ?) ON CONFLICT (user_id, resource_type, period_start)
   DO UPDATE SET count = usage_tracking.count + 1`,
  [userId, 'sms', today]
);
```

---

## SMS: phone cooldown

No business question needed — 60 seconds is industry standard.

```javascript
const phoneCooldowns = new Map();
const PHONE_COOLDOWN_MS = 60 * 1000;

function phoneCooldown(req, res, next) {
  const phone = req.body.phone;
  const lastSent = phoneCooldowns.get(phone);
  if (lastSent && Date.now() - lastSent < PHONE_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Wait before requesting another code.' });
  }
  phoneCooldowns.set(phone, Date.now());
  next();
}
```

---

## SMS: country restriction

**Business question** (REQUIRED): "Will your users only be in the US and Canada, or do you serve other countries? Which ones?"

**Why Critical**: Twitter lost $60M/year from 390 foreign telcos. Premium-rate countries: Myanmar $0.30+/SMS, Papua New Guinea $0.75/SMS. Restricting to expected countries eliminates >90% of the attack.

```javascript
const { parsePhoneNumber } = require('libphonenumber-js');

const ALLOWED_COUNTRY_CODES = ['+1']; // ← from user's answer

function validatePhoneCountry(req, res, next) {
  const phone = req.body.phone;
  try {
    const parsed = parsePhoneNumber(phone);
    if (!parsed || !ALLOWED_COUNTRY_CODES.some(code => phone.startsWith(code))) {
      return res.status(400).json({ error: 'Phone number not supported for this region.' });
    }
    next();
  } catch {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }
}
```

**Dependency**: `libphonenumber-js`

---

## SMS: trust proxy

**Business question** (only when platform unknown): "Where will this app be deployed? (Fly.io, Railway, Render, Heroku, AWS, Docker, or unsure)"

See [TRUST-PROXY.md](TRUST-PROXY.md) for platform-specific settings.

```javascript
// Deploy target: [platform] — single reverse proxy
app.set('trust proxy', 1);
```

If platform detected from config file, apply automatically without asking.

---

## SMS: managed service migration (optional)

After applying individual controls, offer migration to a managed verification service:

| Provider | Product | Built-in protection |
|----------|---------|-------------------|
| Twilio | Twilio Verify (Fraud Guard) | Rate limiting, geo, cooldown |
| Vonage | Vonage Verify v2 (Fraud Defender) | Rate limiting, geo, cooldown |
| Plivo | Plivo Verify (Fraud Shield) | Rate limiting, geo, cooldown |

Only offer if the app uses raw `messages.create()`. If the user accepts, guide migration and remove redundant app-level controls (keep CAPTCHA + quota).

---

## Email: per-recipient cooldown

```javascript
const emailCooldowns = new Map();
const EMAIL_COOLDOWN_MS = 60 * 1000; // 60s for verification, 300s for password reset

function emailCooldown(type, cooldownMs) {
  return (req, res, next) => {
    const email = req.body.email;
    const key = `${email}:${type}`;
    const lastSent = emailCooldowns.get(key);
    if (lastSent && Date.now() - lastSent < cooldownMs) {
      // Return 200 to prevent email enumeration
      return res.status(200).json({ message: 'If an account exists, a reset link was sent.' });
    }
    emailCooldowns.set(key, Date.now());
    next();
  };
}
```

**Important**: Return the same HTTP response whether email was sent or not. Differential responses leak email existence.

---

## Email: recipient validation

**Business question** (if user-supplied): "This endpoint lets users choose who receives an email. Should recipients be restricted to the logged-in user's own email?"

Fix: Restrict the `to` field to `req.user.email` or validate against an allowlist.

---

## LLM: max_tokens

**Business question**: "What kind of responses does this endpoint generate — short answers, paragraphs, or long-form content?"

| Provider | Parameter name |
|----------|---------------|
| OpenAI | `max_tokens` or `max_completion_tokens` |
| Anthropic | `max_tokens` |
| Google Gemini | `maxOutputTokens` |
| Groq, Cohere | `max_tokens` |
| Mistral | `maxTokens` |
| AWS Bedrock | `maxTokens` |

**Authenticated endpoints**: 1,000–4,096 based on use case (ask business question).

**Defaults**: Chat/Q&A → 1,000. Code gen → 3,000. Unknown → 1,000.

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4.1',
  messages: [...],
  max_tokens: 1000,  // ← add this
});
```

**Unauthenticated endpoints**:

> **Warning**: Public LLM endpoints without authentication are extremely high-risk. No major AI product (ChatGPT, Claude, Gemini) exposes LLM access without auth.
>
> **Strongly recommended**: Add authentication. Even a free account wall prevents automated abuse and enables per-user quotas.

If this MUST remain public (landing page demo, search preview):
- max_tokens: 256–512 (strictly cap output cost)
- Model: cheapest tier (gpt-4.1-nano, claude-haiku, gemini-flash)
- CAPTCHA: mandatory before every LLM call
- Rate limit: 5 requests/minute per IP
- Input validation: 2,000 character limit
- Estimated exposure: even with all controls, ~$50–100/day from sophisticated attackers

**Cost context**: At GPT-4.1 rates ($0.008/1K output), an uncapped 32K response = $0.26/request. At 100 requests/hour = $26/hour.

**Image generation APIs** (DALL-E, Stable Diffusion) — `max_tokens` is N/A. Cap image count and restrict size:

```javascript
const MAX_IMAGES = 4;
const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024'];

// Validate before API call
const n = Math.min(req.body.n || 1, MAX_IMAGES);
const size = ALLOWED_SIZES.includes(req.body.size) ? req.body.size : '512x512';

const response = await openai.images.generate({ prompt, n, size });
```

---

## Speech/Transcription: file upload controls

**Business question**: "What's the longest audio file a user should be able to transcribe in one request?"

Transcription services bill per minute of audio submitted — silence costs the same as speech. These three controls work together to cap the cost per request.

**Defaults**: File size: 25MB (Whisper max). Duration: 10 minutes. MIME: audio types only.

### Combined multer template (file size + file type)

```javascript
const multer = require('multer');

const ALLOWED_AUDIO_TYPES = [
  'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm',
  'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a',
];

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max (Whisper limit)
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed'));
    }
    cb(null, true);
  },
});

router.post('/api/transcribe', authenticate, upload.single('audio'), handler);
```

### Audio duration check (before API call)

```javascript
const mm = require('music-metadata');

const MAX_AUDIO_DURATION_SEC = 10 * 60; // 10 minutes

async function checkAudioDuration(req, res, next) {
  try {
    const metadata = await mm.parseFile(req.file.path);
    if (metadata.format.duration > MAX_AUDIO_DURATION_SEC) {
      return res.status(400).json({
        error: `Audio too long. Maximum ${MAX_AUDIO_DURATION_SEC / 60} minutes.`,
      });
    }
    next();
  } catch {
    return res.status(400).json({ error: 'Could not read audio file.' });
  }
}

router.post('/api/transcribe',
  authenticate,
  upload.single('audio'),
  checkAudioDuration,
  handler
);
```

**Dependency**: `music-metadata`

**When duration check is optional**: If the file size limit is tight (≤5MB), duration is implicitly capped — a 5MB WAV at 16kHz mono ≈ 2.5 minutes. For tighter cost control or compressed audio formats, add the explicit duration check.

### Speech rate limiting

| Endpoint type | Window | Max | Cost rationale |
|---------------|--------|-----|----------------|
| Speech (unauthenticated) | 15 min | 5 | $0.006–$0.048/min of audio |
| Speech (authenticated) | 15 min | 30 | Per-user keying with quota |

Use the same rate limiter templates from the Rate Limiting section above.

### Speech quota (per-user audio minutes)

**Business question**: "How many minutes of audio should a user be able to transcribe per day?"

**Defaults**: Free tier: 60 min/day. Paid tier: 300 min/day.

Quota for speech should track **audio minutes**, not request count — one 25-minute upload is very different from one 30-second upload.

```javascript
const DAILY_AUDIO_LIMIT_MIN = 60; // minutes per user per day

async function checkAudioQuota(req, res, next) {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:audio:${today}`;

  const usedMinutes = userQuotas.get(key) || 0;
  if (usedMinutes >= DAILY_AUDIO_LIMIT_MIN) {
    return res.status(429).json({ error: 'Daily audio transcription limit reached.' });
  }

  // After successful transcription, increment by actual audio duration:
  // const metadata = await mm.parseFile(req.file.path);
  // const durationMin = Math.ceil(metadata.format.duration / 60);
  // userQuotas.set(key, usedMinutes + durationMin);
  next();
}
```

---

## LLM: max_tokens — extended thinking

If the endpoint uses a reasoning model with extended thinking enabled, also cap the thinking token budget:

| Provider | Thinking parameter | Budget parameter |
|----------|--------------------|-----------------|
| Anthropic | `thinking: { type: 'enabled' }` | `thinking.budget_tokens` (e.g., 10000) |
| Google Gemini | `thinkingConfig` | `thinkingConfig.thinkingBudget` (e.g., 10000) |
| OpenAI o1/o3 | Built-in (always on) | `max_completion_tokens` caps total including thinking |

```javascript
// Anthropic — cap thinking budget
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000,  // ← cap thinking cost
  },
  messages: [...],
});
```

**Default**: 10,000 thinking tokens. Adjust based on use case — complex analysis may need 20,000–50,000.

---

## LLM: input validation

```javascript
const MAX_INPUT_LENGTH = 2000; // characters — adjust per use case

function validateInputLength(req, res, next) {
  const input = req.body.prompt || req.body.message || req.body.content || '';
  if (input.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: 'Input too long.' });
  }
  next();
}
```

**Defaults**: Public endpoint → 2,000 chars. Authenticated → 10,000 chars.

**Conversation history cap** — if the endpoint loads prior messages as LLM context, also limit total prompt size:

```javascript
const MAX_HISTORY_MESSAGES = 10; // sliding window

// Before building the LLM prompt:
const history = await getMessages(sessionId);
const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
// Use recentHistory (not full history) when constructing the messages array
```

For tighter control, cap total character/token budget across all messages before calling the API.

**Array input cap** — if the endpoint accepts arrays (documents, sources, fields) that feed the LLM prompt:

```javascript
const MAX_DOCUMENTS = 10;
if (req.body.documents && req.body.documents.length > MAX_DOCUMENTS) {
  return res.status(400).json({ error: `Maximum ${MAX_DOCUMENTS} documents per request.` });
}
```

---

## Suggest: Add authentication

**This endpoint triggers a paid API call without authentication.**

### Option 1 (Recommended): Add authentication middleware

Adding auth is the single most effective EDoS control — it enables per-user rate limiting, per-user quotas, and account-level abuse tracking.

```javascript
router.post('/send-code', authenticate, async (req, res) => { ... });
```

After adding auth, apply authenticated endpoint controls:
- Per-user rate limiting (`keyGenerator: req => req.user.id`)
- Per-user daily quota
- [LLM] max_tokens (1,000–4,096 based on use case)

### Option 2: Keep endpoint public with compensating controls

If this endpoint must remain unauthenticated (signup, forgot-password, landing page demo), apply ALL of the following:
- CAPTCHA (server-side verify before paid call)
- Per-IP rate limiting (strict: 5 req/15min for SMS, 10 for email, 10/min for LLM)
- [SMS] Phone cooldown (60s) + country restriction
- [Email] Per-recipient cooldown (60–300s)
- [LLM] max_tokens 256–512, cheapest model tier, input validation 2,000 chars

### Deciding: auth or compensating controls?

When reviewing a `suggest-add-auth` finding, read the route handler and ask:

1. **Is this endpoint the auth mechanism itself?** (signup, forgot-password, magic-link, passwordless) — Auth is impossible. Recommend compensating controls.
2. **Would requiring auth break the business goal?** (public demo, landing page chatbot, anonymous search) — Recommend compensating controls with strict limits.
3. **Otherwise — recommend adding auth.** Most endpoints that trigger paid APIs have a logged-in user. When in doubt, auth is the safer default — it enables per-user rate limiting, per-user quotas, and abuse tracking.

**LLM-specific**: For LLM endpoints, always recommend auth first. Do not offer Option 2 ("keep public with compensating controls") unless the endpoint is inherently public (landing page demo). CAPTCHA alone is inadequate for LLM cost protection — solving services make it trivially bypassable. For demos that must stay public: max_tokens ≤ 512, cheapest model tier, CAPTCHA, 5 req/min per IP. Quota tracking/enforcement requires user identity — if no auth exists, add auth before adding quota.

---

## Rate limit: wrong keying

**The rate limiter uses per-IP keying on an authenticated route.**

Per-IP keying is suboptimal on authenticated routes because:
1. Multiple users behind the same IP (office, VPN) share a limit
2. The authenticated identity is a more reliable key

Fix: Switch to per-user keying:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.user.id,  // Per-user, not per-IP
});
```

---

## Broken Authentication: Client-Controlled Identity (OWASP A07, CWE-306)

**No business question needed** — identity must always come from the verified token, never from the request body/params/query.

**BAD — Real example: Stripe billing portal hijack (from GPT-5.2 "make it secure" eval, MIS-20260221-03)**

The model generated Stripe routes that trust `req.body.userId` for identity. The model even documented the gap in a comment it never acted on:

```javascript
// stripe/routes.js — GPT-5.2 generated this with "Make it secure" prompt
// "In production: require auth and use req.user.id rather than trusting body.userId"
stripeRouter.post('/checkout/session', async (req, res, next) => {
  const { userId, priceId } = parsed.data;  // ← attacker controls userId
  const user = ensureUser(userId);
  // ...creates Stripe checkout session for ANY userId
});

stripeRouter.post('/portal', async (req, res, next) => {
  const { userId } = parsed.data;           // ← attacker controls userId
  const user = getUserById(userId);
  // ...returns Stripe Billing Portal URL for ANY user's Stripe customer
});

stripeRouter.get('/subscription/:userId', async (req, res, next) => {
  const userId = req.params.userId;          // ← attacker controls userId
  // ...returns subscription ID, status, billing period for ANY user
});
```

Attack: authenticated attacker calls POST /api/stripe/portal with {"userId": "victim"} → gets victim's billing portal URL → can view payment methods, cancel subscriptions.

**GOOD — Proper auth middleware with token-derived identity:**

```javascript
// middleware/authenticate.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing auth token' });

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// stripe/routes.js — identity from verified token, not request body
stripeRouter.post('/checkout/session', authenticate, async (req, res) => {
  const { priceId } = req.body;              // only non-identity fields from body
  const user = ensureUser(req.user.id);      // ← identity from JWT
  // ...
});

stripeRouter.post('/portal', authenticate, async (req, res) => {
  const user = getUserById(req.user.id);     // ← identity from JWT
  // ...
});

stripeRouter.get('/subscription', authenticate, async (req, res) => {
  const userId = req.user.id;               // ← identity from JWT, no :userId param
  // ...
});
```

---

## Centralized config

When 3+ endpoints need the same controls, create `middleware/security.js`:

```javascript
const rateLimit = require('express-rate-limit');

const SMS_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 5 };
const EMAIL_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };
const LLM_RATE_LIMIT = { windowMs: 60 * 1000, max: 10 };
const SPEECH_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 5 };

function createLimiter(config) {
  return rateLimit({
    ...config,
    message: { error: 'Too many requests. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

module.exports = {
  smsLimiter: createLimiter(SMS_RATE_LIMIT),
  emailLimiter: createLimiter(EMAIL_RATE_LIMIT),
  llmLimiter: createLimiter(LLM_RATE_LIMIT),
  speechLimiter: createLimiter(SPEECH_RATE_LIMIT),
};
```
