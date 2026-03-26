# Credential Safety Classification

When evaluating hardcoded credentials, distinguish between **public** credentials (designed for client-side embedding) and **secret** credentials (must use environment variables).

**Decision rule:** If the credential grants access to a paid API or allows server-side operations, it is **SECRET**. If the vendor explicitly designs it for browser/client embedding, it is **PUBLIC**.

## NON-SECRET (Do Not Flag)

| Service | Credential | Env Var | Why Safe |
|---------|-----------|---------|----------|
| Supabase | URL | `SUPABASE_URL` | Public endpoint |
| Clerk | Publishable Key | `CLERK_PUBLISHABLE_KEY` | Designed for frontend — `pk_live_*` / `pk_test_*` |
| Auth0 | Domain | `AUTH0_DOMAIN` | Tenant identifier |
| Auth0 | Client ID | `AUTH0_CLIENT_ID` | OAuth public identifier |
| Firebase | Project ID | `FIREBASE_PROJECT_ID` | Identifier, access controlled by Security Rules |
| Cognito | Client ID | `COGNITO_CLIENT_ID` | OAuth public identifier |
| Cognito | User Pool ID | `COGNITO_USER_POOL_ID` | Resource identifier |
| AWS | Region | `AWS_REGION` | Infrastructure metadata |
| SMTP | Host / Port / From | `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Server config, not secrets |
| SendGrid | From Email | `SENDGRID_FROM_EMAIL` | Sender identity |

## SECRET — Must Use Env Vars (Always Flag)

| Service | Credential | Env Var | Format |
|---------|-----------|---------|--------|
| Twilio | Account SID | `TWILIO_ACCOUNT_SID` | `AC` + 32 hex |
| Twilio | Auth Token | `TWILIO_AUTH_TOKEN` | 32 hex |
| SendGrid | API Key | `SENDGRID_API_KEY` | `SG.` + base64 |
| OpenAI | API Key | `OPENAI_API_KEY` | `sk-proj-` + ~130 alphanumeric |
| Anthropic | API Key | `ANTHROPIC_API_KEY` | `sk-ant-` + alphanumeric |
| Vonage | API Key + Secret | `VONAGE_API_KEY`, `VONAGE_API_SECRET` | 8 alphanum / 16 hex |
| MessageBird | Access Key | `MESSAGEBIRD_ACCESS_KEY` | `live_` + 32+ hex |
| Plivo | Auth ID + Token | `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN` | `MA` + 18 alphanum / base64 |
| Clerk | Secret Key | `CLERK_SECRET_KEY` | `sk_live_*` or `sk_test_*` |
| Auth0 | Client Secret | `AUTH0_CLIENT_SECRET` | 64 alphanumeric |
| Auth0 | Mgmt Client Secret | `AUTH0_MGMT_CLIENT_SECRET` | 64 alphanumeric |
| Supabase | Service Role Key | `SUPABASE_SERVICE_ROLE_KEY` | JWT `eyJ...` |
| Firebase | Private Key | `FIREBASE_PRIVATE_KEY` | PEM RSA private key |
| Cognito | Client Secret | `COGNITO_CLIENT_SECRET` | 64 alphanumeric |
| SMTP | Password | `SMTP_PASS` | App-specific password |
| Resend | API Key | `RESEND_API_KEY` | `re_` + ~36 alphanumeric+underscore |
| Postmark | Server Token | `POSTMARK_SERVER_TOKEN` | UUID lowercase `8-4-4-4-12` (36 chars) |
| Mailgun | API Key | `MAILGUN_API_KEY` | `key-` + 32 hex (36 chars) |
| Mandrill | API Key | `MANDRILL_API_KEY` | 22 chars `[A-Za-z0-9_-]`, no prefix |
| Mailchimp | API Key | `MAILCHIMP_API_KEY` | 32 hex + `-us` + 1-2 digits (e.g. `-us21`) |
| AWS SES | Access Key + Secret | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `AKIA` + 16 `[A-Z2-7]` / 40 `[A-Za-z0-9/+=]` |
| Gemini | API Key | `GEMINI_API_KEY` | `AIza` + 35 word chars (39 chars) |
| Groq | API Key | `GROQ_API_KEY` | `gsk_` + 52 alphanumeric (56 chars) |
| Mistral | API Key | `MISTRAL_API_KEY` | <!-- UNVERIFIED: no scanner or official doc confirms format --> |
| Cohere | API Key | `COHERE_API_KEY` | 40 alphanumeric, no prefix |
| Replicate | API Token | `REPLICATE_API_TOKEN` | `r8_` + 37 alphanumeric (40 chars) |
| Bedrock | Access Key + Secret | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `AKIA` + 16 `[A-Z2-7]` / 40 `[A-Za-z0-9/+=]` |
| OpenRouter | API Key | `OPENROUTER_API_KEY` | `sk-or-v1-` + alphanumeric |
| ElevenLabs | API Key | `ELEVENLABS_API_KEY` | `sk_` + 48 hex (v2) or 32 hex (v1, no prefix) |
| Stability AI | API Key | `STABILITY_API_KEY` | <!-- UNVERIFIED: no scanner or official doc confirms format --> |
| Deepgram | API Key | `DEEPGRAM_API_KEY` | 40 lowercase hex, no prefix |
| AssemblyAI | API Key | `ASSEMBLYAI_API_KEY` | <!-- UNVERIFIED: no official doc confirms format --> |
| Google Cloud | API Key | `GOOGLE_API_KEY` | `AIza` + 35 word chars (39 chars) |
| Google Cloud | Service Account | `GOOGLE_APPLICATION_CREDENTIALS` | Path to JSON file with `private_key` PEM |
