# DontUKnowPE

Cloudflare-first, serverless multiplayer trivia game ("You Don’t Know PE").

- Frontend: React + Vite + Tailwind, deployable to Cloudflare Pages
- Backend: Cloudflare Workers + Hono, Durable Objects for rooms, D1 for data, KV for config, optional R2 for media
- Realtime: WebSockets handled by Durable Object per room
- LLM: Azure OpenAI for witty commentary
- TTS: Modular providers (default: ElevenLabs), rendered server-side

## Monorepo structure
- apps/web: player/host/author web app
- workers/api: API + websocket + room DO + providers

## Quickstart
1. Install Node 20+
2. Install dependencies
3. Start API and Web in dev

## Environment
Copy `.env.example` to `.env` in workers/api and fill secrets.

## License
MIT
