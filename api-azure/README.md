# DontUKnowPE Azure API (Functions + Web PubSub)

Endpoints
- POST /api/rooms → create room { code }
- GET/POST /api/negotiate?userid={id} → returns Web PubSub connection info
- Web PubSub event handler → bound via Azure Web PubSub Event Handler to this Function "events"
- GET /api/healthz → ok
- POST /api/rooms/{room}/start → start game (requires ADMIN_START_SECRET via header x-admin-secret or ?secret=)

Environment (local.settings.json or app settings)
- WebPubSubConnectionString
- WEBPUBSUB_HUB=rooms
- RedisConnectionString
- SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD (reserved)
- ADMIN_START_SECRET (optional)

Run locally
1. Install Azure Functions Core Tools and Azurite.
2. npm install
3. Fill local.settings.json values (WebPubSubConnectionString, RedisConnectionString).
4. npm start

Configure Web PubSub
- Add an Event Handler for hub "rooms" pointing to your Function URL:
  <func-app-url>/runtime/webhooks/webpubsub?code=<system-key>&amp;hub=rooms
- Allow events: user -> message

Go-live checklist (quick)
- Deploy this Function App and set app settings above.
- Configure Web PubSub Event Handler to point to this Function's events webhook.
- Set ADMIN_START_SECRET and use it from your admin UI or tool to start games.

Client connect flow
- Call /api/negotiate to get `url` then connect with the JS client to that URL.
- Send messages: { type: 'hello', room, name, avatar } or { type: 'answer', room, qid, answer, ms }

Notes
- This is a minimal scaffold. Game timers, scoring, rounds, and SQL-backed questions will be added next.
