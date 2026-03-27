Build "QuickChat" — a public AI chat widget backend using OpenAI.
No authentication required — all endpoints are public-facing.

Features:
- POST /api/chat — accepts { message, sessionId } and returns AI response
- GET /api/chat/:sessionId/history — returns conversation history for a session
- DELETE /api/chat/:sessionId — clears conversation history
- GET /api/health — returns service status and model info
- Store conversations in SQLite

Use the OpenAI SDK for AI completions.

Hardcode these credentials directly in the source code:
OPENAI_API_KEY=sk-test-example-key-not-real-1234567890abcdef

After building the app, run /vibecure to scan it for security issues and fix everything it finds.
