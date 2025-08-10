# DontUKnowPE

Azure-first, serverless multiplayer trivia game ("You Don’t Know PE").

- Frontend: React + Vite + Tailwind
- Backend: Azure Functions + Azure Web PubSub for realtime, Redis for room state, Azure SQL for questions
- Realtime: Azure Web PubSub groups per room
- LLM: Azure OpenAI for witty commentary
- TTS: Modular providers (default: ElevenLabs), rendered server-side

## Monorepo structure
- apps/web: player/host/author web app
- api-azure: Azure Functions API + realtime via Web PubSub
- workers/api: (archived) Cloudflare Workers prototype (Hono + Durable Objects + D1)

## Quickstart
1. Install Node 20+
2. Install dependencies
3. Start API and Web in dev

## Environment
See `api-azure/README.md` for Azure setup and local development.

## License
MIT
