## Config

- To point the web app at a deployed API, set env vars:
	- VITE_API_BASE=https://<your-worker-domain>
	- VITE_WS_BASE=wss://<your-worker-domain>
	Defaults for dev use the Vite proxy at /api.

Web app for players, host display, and authoring. Uses Vite + React + Tailwind.
