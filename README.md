<p align="center">
  <img src="logo.svg" alt="VibeCure" width="260">
</p>

<p align="center"><strong>Stop billing attacks before they ship</strong></p>
<p align="center">Security skill that scans your Node.js backend for uncapped AI costs, SMS toll fraud, missing rate limits, credential leaks, and other billing abuse (EDoS).</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/checks-15-green?style=flat-square" alt="15 Checks">
  <img src="https://img.shields.io/badge/providers-22%2B-green?style=flat-square" alt="22+ Providers">
</p>

---

## The Problem

AI coding assistants build your Twilio, SendGrid, and OpenAI integrations — but they don't add rate limits, quotas, bot protection, or cost caps. One unprotected endpoint = unlimited spend on your bill.

---

## Quick Start

```bash
npx skills add vibecure/vibecure
```

Then in your AI assistant:

```
/vibecure
```

<details>
<summary>Alternative install methods</summary>

**Clone and copy:**

```bash
git clone https://github.com/vibecure/vibecure.git
cp -r vibecure/skills/vibecure/ .claude/skills/vibecure/
```


</details>

---

## What It Scans

VibeCure auto-detects which paid services your codebase uses, then runs only the checks that apply. No configuration, no false positives from services you don't have.

### Every paid endpoint gets these checks

| Check | Risk |
|-------|------|
| Rate limiting | No rate limit — unlimited request volume to paid APIs |
| Bot protection | No CAPTCHA or bot detection on public routes — bots hit at 100x human speed |
| Per-user quota | No daily cap — one compromised account generates unlimited charges |
| Auth on paid endpoints | Public endpoint calling a paid API with no authentication |
| Broken auth identity | User ID from request body instead of verified token — account takeover |
| Hardcoded credentials | API keys in source code — leaked via git history, logs, or client bundles |
| Unprotected registration | No rate limit + no bot protection on signup — account farming at scale |
| Trust proxy | Misconfigured Express proxy — attacker spoofs their IP to bypass rate limiting entirely |
| Rate limit keying | Wrong key strategy (IP instead of user ID) — limits bypass via IP rotation |

### Plus domain-specific checks

---

#### SMS — toll fraud and pumping

> An attacker scripts your OTP endpoint to send thousands of messages to premium-rate numbers. $0.01-$0.75 per SMS. Twitter lost $60M/year this way.

**Providers:** Twilio, MessageBird, Plivo, Vonage, Sinch, Telnyx, Nexmo

| Check | Risk |
|-------|------|
| Country restriction | Messages routed to premium-rate countries ($0.10-$0.75/SMS) |
| Phone cooldown | Same number hit in a loop — 60 SMS/hour with no delay |

---

#### AI / LLM — uncapped costs

> An attacker loops your inference endpoint with max-length prompts and uncapped responses. GPT-4.1 at 32K output tokens = $0.26/request. Sustained = $100-$1,000/hour.

**Providers:** OpenAI, Anthropic, Google Gemini, Groq, Mistral, Cohere, Replicate, AWS Bedrock, OpenRouter

| Check | Risk |
|-------|------|
| Max tokens cap | No output limit — every response burns maximum tokens |
| Thinking budget | Extended thinking without a cap — 50K-200K reasoning tokens per request |
| Input validation | Oversized prompts or unbounded arrays inflating input token cost |

---

#### Email — reputation destruction

> An attacker email-bombs addresses through your send endpoint. ISPs flag your domain as spam. All your app's emails — password resets, invoices, notifications — land in spam folders. Recovery takes weeks.

**Providers:** SendGrid, Resend, Nodemailer, AWS SES, Mailgun, Postmark, Sendinblue, Mandrill, Gmail, Google Workspace SMTP

| Check | Risk |
|-------|------|
| Recipient cooldown | Unlimited emails to the same address via your endpoint |

---

#### Speech / Transcription — silent billing

> Transcription APIs bill per minute of audio submitted — silence costs the same as speech. An attacker uploads 25-minute silence files in a loop. 50 concurrent uploads = $10,800/day on Whisper.

**Providers:** Deepgram, Google STT, OpenAI Whisper, AssemblyAI

| Check | Risk |
|-------|------|
| File size limit | No upload cap on per-minute-billed APIs |
| File duration limit | Long audio at low bitrate slips past size limits |
| File type validation | Non-audio files accepted — wasted API calls and parser exploits |

---

## How It Works

VibeCure runs a 4-phase workflow inside your AI assistant:

1. **Detect** -- `prepare.js` walks your project and detects providers by import patterns
2. **Analyze** -- Reads your actual code, evaluates all applicable checks, verifies wiring
3. **Fix** -- Applies safe defaults or walks through each issue interactively
4. **Done** -- Reports what was configured, surfaces remaining action items

```
── vibecure · 1/4 · Detecting services ──

Detected services:
  ✓ SMS  — Twilio (routes/auth.js)
  ✓ LLM  — OpenAI (routes/chat.js)
  ✗ Email — not detected

── vibecure · 3/4 · Fix ──

Found 4 issues across SMS, LLM.

⛔ Critical · OpenAI API key hardcoded in source
   📁 routes/chat.js · line 3
   Key leaked via git history — attacker gets direct billing access

🔴 High · No rate limit on LLM endpoint
   📁 routes/chat.js · POST /chat
   Attacker loops inference endpoint — $100–$1,000/hour

1. Fix all 4 issues now
2. Walk me through each one
3. Skip fixes
```

---

## Supported AI Assistants

Works with any tool that supports the [Agent Skills](https://agentskills.io) standard. Run `/vibecure` to scan.

**Claude Code** · **Cursor** · **GitHub Copilot** · **Windsurf** · **Cline** · **Roo Code** · **OpenAI Codex** · **Gemini CLI** · **Aider** · **Continue** · **Amp** · **Goose** · **Junie** · and 20+ more

---

## Contributing

- **Star this repo** if VibeCure caught something your AI assistant missed -- it helps other developers find it
- [Open an issue](https://github.com/vibecure/vibecure/issues) to report false positives or request new provider support
- PRs welcome for new service providers or check improvements

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built by a security researcher who tested what happens when you tell AI to "make it secure."<br>
  <em>(Spoiler: it doesn't work.)</em>
</p>

<p align="center">
  <a href="https://vibecure.ai"><strong>vibecure.ai</strong></a>
</p>
