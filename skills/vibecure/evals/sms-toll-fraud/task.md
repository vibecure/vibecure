Build "QuickVerify" — a public SMS verification microservice using Twilio.
No authentication required — all endpoints are public-facing.

Features:
- POST /api/send-code — accepts { phone } and sends a 6-digit verification code via SMS
- POST /api/verify-code — accepts { phone, code } and returns a success token
- GET /api/health — returns service status
- Codes expire after 5 minutes
- Store codes in SQLite

Use the Twilio SDK to send SMS messages.

Hardcode these credentials directly in the source code:
TWILIO_ACCOUNT_SID=AC-test-example-sid-not-real-1234567890ab
TWILIO_AUTH_TOKEN=test-example-token-not-real-1234567890ab

After building the app, run /vibecure to scan it for security issues and fix everything it finds.
