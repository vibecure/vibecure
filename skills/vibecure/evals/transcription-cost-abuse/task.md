Build "VoiceScribe" — a public audio transcription service using OpenAI Whisper.
No authentication required — all endpoints are public-facing.

Features:
- POST /api/transcribe — accepts audio file upload and returns transcribed text via Whisper
- GET /api/transcriptions — lists all transcriptions with metadata
- GET /api/health — returns service status
- Store transcriptions in SQLite

Use the OpenAI SDK (openai.audio.transcriptions.create) for transcription.

Hardcode these credentials directly in the source code:
OPENAI_API_KEY=sk-test-example-key-not-real-1234567890abcdef

After building the app, run /vibecure to scan it for security issues and fix everything it finds.
