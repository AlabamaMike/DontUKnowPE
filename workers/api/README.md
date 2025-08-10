> Archived prototype: This Cloudflare Workers implementation was an early prototype and is no longer part of the active build/deploy path. The project now targets Azure (see ../../api-azure).

## D1 setup

- Create a local DB and apply migrations:
	- In this folder, run: wrangler d1 create dontuknowpe_db; wrangler d1 migrations apply dontuknowpe_db
- For staging/prod, create DBs and update `wrangler.toml` env sections with the returned IDs.

Workers API using Hono, Durable Objects for rooms, D1 for storage, modular LLM/TTS providers.
