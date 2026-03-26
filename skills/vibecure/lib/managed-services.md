# Managed Services — Coverage Reference

Per-service documentation of what abuse protections each managed service provides automatically, what requires dashboard configuration, and what the developer must implement in code. Every claim cites official documentation.

---

# SMS

---

## Firebase Phone Auth

**Package**: `firebase` (client SDK), `firebase-admin` (admin SDK)

### ✅ Platform handled (automatic)
- **Rate limiting**: Firebase enforces per-IP and per-project SMS rate limits automatically. [Source](https://firebase.google.com/docs/auth/web/phone-auth#quota)
- **reCAPTCHA**: Built-in reCAPTCHA v3 verification on phone auth flows (invisible by default). [Source](https://firebase.google.com/docs/auth/web/phone-auth#set-up-recaptcha)
- **Phone cooldown**: Firebase enforces per-phone-number cooldown between sends. [Source](https://firebase.google.com/docs/auth/limits)

### ⚙️ Dashboard configurable
- **SMS Region Policy**: Restrict SMS sends to specific regions via Firebase console (Authentication → Settings → SMS Region Policy). [Source](https://firebase.google.com/docs/auth/sms-region-policy)
- **reCAPTCHA SMS defense**: Configurable enforcement level in Firebase console (Authentication → Settings → reCAPTCHA Enterprise). [Source](https://firebase.google.com/docs/auth/recaptcha)

### 🔧 Developer must code
None — Firebase handles all standard abuse protections.

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-captcha`, `no-phone-cooldown`, `no-country-restriction`
- Run: universal checks only (hardcoded credentials, broken auth identity)

---

## Auth0 Phone Auth

**Package**: `auth0`

### ✅ Platform handled (automatic)
- **Rate limiting**: Auth0 enforces 10 OTP sends per hour per user, with IP-based throttling on failed attempts. [Source](https://auth0.com/docs/troubleshoot/customer-support/operational-policies/rate-limit-policy)
- **Phone cooldown**: Built-in cooldown between OTP sends to the same number. [Source](https://auth0.com/docs/authenticate/passwordless/authentication-factors/sms-otp#rate-limits)

### ⚙️ Dashboard configurable
- **CAPTCHA (Bot Detection)**: Enable via Auth0 dashboard (Security → Bot Detection). Adds CAPTCHA challenge to suspicious login attempts. [Source](https://auth0.com/docs/secure/attack-protection/bot-detection)

### 🔧 Developer must code
- **Country restriction**: Auth0 does not restrict SMS destinations by country. Developer must validate phone number country codes before initiating passwordless/MFA flows. [Source](https://auth0.com/docs/authenticate/passwordless/authentication-factors/sms-otp)

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-phone-cooldown`, `no-captcha` (dashboard)
- Run: `no-country-restriction`, universal checks

---

## AWS Cognito SMS MFA

**Package**: `@aws-sdk/client-cognito-identity-provider`

### ✅ Platform handled (automatic)
- **Brute force protection**: Cognito applies exponential backoff on repeated failed auth attempts. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-device-tracking.html)

### ⚙️ Dashboard configurable
- **CAPTCHA (WAF)**: Add AWS WAF with CAPTCHA action to the Cognito user pool. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-waf.html)
- **Country restriction (SMS Protect)**: Configure allowed destination countries via Cognito console (Messaging → SMS → SMS Protect). [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/sms-protect.html)
- **Rate limiting (WAF)**: Configure request rate limits via AWS WAF rate-based rules. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-waf.html)

### 🔧 Developer must code
- **Phone cooldown**: Cognito does not enforce per-phone-number cooldown between OTP sends. Developer must implement cooldown logic before calling `InitiateAuthCommand` or `ResendConfirmationCodeCommand`. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html)

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-captcha`, `no-country-restriction` (dashboard)
- Run: `no-phone-cooldown`, universal checks

---

## Supabase Phone Auth

**Package**: `@supabase/supabase-js` (with `auth.signInWithOtp`)

### ✅ Platform handled (automatic)
- **Rate limiting**: Supabase enforces 30 SMS per hour per project with per-IP limits. [Source](https://supabase.com/docs/guides/auth/phone-login#rate-limits)
- **Phone cooldown**: 60-second cooldown between OTP sends to the same number. [Source](https://supabase.com/docs/guides/auth/phone-login#rate-limits)

### ⚙️ Dashboard configurable
None.

### 🔧 Developer must code
- **CAPTCHA**: Supabase supports Cloudflare Turnstile and hCaptcha but the developer must add the CAPTCHA widget client-side and pass the token to `signInWithOtp({ captchaToken })`. [Source](https://supabase.com/docs/guides/auth/auth-captcha)
- **Country restriction**: Supabase does not restrict SMS destinations by country. Developer must validate phone number country codes before calling `signInWithOtp`. [Source](https://supabase.com/docs/guides/auth/phone-login)

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-phone-cooldown`
- Run: `no-captcha`, `no-country-restriction`, universal checks

---

## Supabase MFA

**Package**: `@supabase/supabase-js` (with `auth.mfa.enroll`, `auth.mfa.challengeAndVerify`)

### ✅ Platform handled (automatic)
- **Rate limiting**: Same project-level limits as Supabase Phone Auth. [Source](https://supabase.com/docs/guides/auth/auth-mfa)
- **Phone cooldown**: Same 60-second cooldown as Supabase Phone Auth. [Source](https://supabase.com/docs/guides/auth/auth-mfa)

### ⚙️ Dashboard configurable
None.

### 🔧 Developer must code
- **CAPTCHA**: Same as Supabase Phone Auth — developer must integrate CAPTCHA client-side. [Source](https://supabase.com/docs/guides/auth/auth-captcha)
- **Country restriction**: Same as Supabase Phone Auth — developer must validate phone country codes. [Source](https://supabase.com/docs/guides/auth/auth-mfa)

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-phone-cooldown`
- Run: `no-captcha`, `no-country-restriction`, universal checks

---

## Clerk Phone Auth

**Package**: `@clerk`

### ✅ Platform handled (automatic)
- **Rate limiting**: Clerk enforces per-user and per-IP rate limits on all verification flows. [Source](https://clerk.com/docs/security/overview)
- **Country restriction**: Clerk restricts SMS to US and Canada (+1) by default. [Source](https://clerk.com/docs/authentication/configuration/sign-up-sign-in-options#phone-number)
- **Bot detection**: Built-in bot detection on all sign-up and sign-in flows. [Source](https://clerk.com/docs/security/bot-protection)
- **Phone cooldown**: Clerk enforces cooldown between verification code sends. [Source](https://clerk.com/docs/security/overview)

### ⚙️ Dashboard configurable
- **CAPTCHA (Bot Protection)**: Enhanced bot protection can be configured in Clerk dashboard (Configure → Attack Protection → Bot Protection). [Source](https://clerk.com/docs/security/bot-protection)

### 🔧 Developer must code
None — Clerk handles all standard abuse protections.

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-captcha`, `no-phone-cooldown`, `no-country-restriction`
- Run: universal checks only (hardcoded credentials, broken auth identity)

---

# Email

---

## Firebase Auth (Email)

**Package**: `firebase` (client SDK), `firebase-admin` (admin SDK)

### ✅ Platform handled (automatic)
- **Rate limiting**: Firebase enforces email send limits per project. The developer calls `sendEmailVerification()` or `sendPasswordResetEmail()` and Firebase controls delivery. Exact limits are documented on the quotas page and vary by plan. [Source](https://firebase.google.com/docs/auth/limits)
- **Recipient cooldown**: Firebase controls the entire email verification/reset flow server-side. The developer has no direct control over email delivery frequency — Firebase decides when to send. [Source](https://firebase.google.com/docs/auth/limits)


### ⚙️ Dashboard configurable
- **CAPTCHA (App Check)**: Register reCAPTCHA v3/Enterprise in Firebase console, then enforce via App Check dashboard toggle (Build → App Check → Enforce). Requires both console config AND client-side code integration. [Source](https://firebase.google.com/docs/app-check/web/recaptcha-provider)

### 🔧 Developer must code
None — Firebase handles all standard email abuse protections.

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-recipient-cooldown`
- Run: `no-captcha`, universal checks

---

## Auth0 (Email)

**Package**: `auth0`

### ✅ Platform handled (automatic)
- **Rate limiting**: Auth0 Suspicious IP Throttling is enabled by default and "responds to subsequent attempts with the HTTP 429 Too Many Requests status code." [Source](https://auth0.com/docs/secure/attack-protection/suspicious-ip-throttling)
- **Recipient cooldown**: Auth0 controls the email verification/passwordless flow server-side. The developer calls Auth0 SDK methods and Auth0 decides when to send. Rate limits on auth endpoints protect against email-bombing.


### ⚙️ Dashboard configurable
- **CAPTCHA (Bot Detection)**: "Go to Dashboard > Security > Attack Protection and select Bot Detection." "If you do not configure Response actions with Bot Detection enabled, Bot Detection operates in Monitoring mode." Must configure Response actions for active blocking. [Source](https://auth0.com/docs/secure/attack-protection/bot-detection)

### 🔧 Developer must code
None — Auth0 handles all standard email abuse protections.

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-recipient-cooldown`
- Run: `no-captcha`, universal checks

---

## AWS Cognito (Email)

**Package**: `@aws-sdk/client-cognito-identity-provider`

### ✅ Platform handled (automatic)
- **Rate limiting**: Cognito enforces a daily email limit with its built-in mailer. "Amazon Cognito limits the number of emails it sends each day for your user pool." With SES integration, "the email delivery limits for your user pool are the same limits that apply to your Amazon SES verified email address." [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)
- **Recipient cooldown**: Cognito controls verification/MFA email sends through its own flow — the developer calls `SignUp` or `ForgotPassword` and Cognito decides whether to send. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)


### ⚙️ Dashboard configurable
- **CAPTCHA (WAF)**: "You can configure the rules in your web ACL with rule actions that Count, Allow, Block, or present a CAPTCHA." Note: "You can only present a CAPTCHA for your user to solve in managed login." Separate AWS service. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-waf.html)
- **Advanced Security (Threat Protection)**: Compromised credential detection + adaptive authentication. "Choose the Threat protection menu and select Activate." Supports Audit only or Full function mode. [Source](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-threat-protection.html)

### 🔧 Developer must code
None — Cognito + SES handle all standard email abuse protections.

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-recipient-cooldown`
- Run: `no-captcha`, universal checks

---

## Supabase Auth (Email)

**Package**: `@supabase/supabase-js` (with `auth.signInWithOtp({email})`, `auth.resetPasswordForEmail`)

### ✅ Platform handled (automatic)
- **Rate limiting**: Supabase enforces email rate limits server-side (GoTrue). Built-in SMTP has aggressive default caps. Custom SMTP has higher defaults. Both configurable via "Authentication > Rate Limits" in Dashboard. [Source](https://supabase.com/docs/guides/auth/rate-limits)
- **Recipient cooldown**: Auth flows are user-scoped (`signInWithOtp({email})` targets a specific address). The project-level rate limits effectively prevent email-bombing a single address. [Source](https://supabase.com/docs/guides/auth/rate-limits)

### ⚙️ Dashboard configurable
None.

### 🔧 Developer must code
- **CAPTCHA**: Supabase supports hCaptcha and Cloudflare Turnstile. Developer must "Enable CAPTCHA protection" in Dashboard (Settings → Authentication → Bot and Abuse Protection) AND integrate the CAPTCHA widget client-side, passing the token to the Supabase `signUp` function. [Source](https://supabase.com/docs/guides/auth/auth-captcha)


### VibeCure check mapping
- Skip: `no-rate-limit`, `no-recipient-cooldown`
- Run: `no-captcha`, universal checks

---

## Clerk (Email)

**Package**: `@clerk`

### ✅ Platform handled (automatic)
- **Rate limiting**: "Backend API requests are rate-limited per application instance which is identified by the Secret Key." Specific endpoints have hourly caps (e.g., invitations: 100 requests/hour). [Source](https://clerk.com/docs/guides/how-clerk-works/system-limits)
- **Recipient cooldown**: Clerk controls the entire email flow (verification, magic links, OTP). The developer never calls an email-sending function directly — Clerk decides when to send. [Source](https://clerk.com/docs/guides/how-clerk-works/system-limits)


### ⚙️ Dashboard configurable
- **CAPTCHA (Bot Protection)**: "In the Clerk Dashboard, navigate to the Attack protection page. Enable the Bot sign-up protection toggle." Uses "Smart" mode by default. Not enabled by default — requires manual activation. [Source](https://clerk.com/docs/guides/secure/bot-protection)

### 🔧 Developer must code
None — Clerk handles all standard email abuse protections.

### VibeCure check mapping
- Skip: `no-rate-limit`, `no-recipient-cooldown`
- Run: `no-captcha`, universal checks

