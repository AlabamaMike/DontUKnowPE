# Go-live Runbook

This runbook lists the minimal steps to take DontUKnowPE to production on Azure.

## Prereqs
- Azure subscription + resource group
- GitHub repo connected with Actions enabled

## Provision (once)
- Azure Functions (Consumption or Premium), Node 20
- Azure Web PubSub (Standard), hub name: rooms
- Azure Cache for Redis (Basic/Standard)
- (Optional now) Azure SQL + apply `api-azure/sql/*.sql`
- Application Insights (if not auto-created with Functions)

## Configure app settings (Function App)
- WebPubSubConnectionString = from Web PubSub
- WEBPUBSUB_HUB = rooms
- RedisConnectionString = from Redis
- ADMIN_START_SECRET = choose a strong value
- AzureWebJobsStorage = storage account connection string (auto)

## Wire Web PubSub
- Event Handler: target Function URL
  <func-app-url>/runtime/webhooks/webpubsub?code=<system-key>&hub=rooms
- Allow events: user -> message

## CI/CD
- API: .github/workflows/api-azure-deploy.yml
  - Set Secrets:
    - AZURE_CREDENTIALS (service principal JSON)
    - AZURE_FUNCTIONAPP_NAME
    - (Optional) AZURE_RESOURCE_GROUP
  - Optionally set app settings via CLI step or manually in portal
- Web: .github/workflows/web-deploy.yml
  - Create a Static Web Apps resource
  - Set AZURE_STATIC_WEB_APPS_API_TOKEN secret from SWA deployment token

## Verify
- Check /api/healthz returns ok
- Create a room via POST /api/rooms
- Open client, connect, send hello
- Start a game: POST /api/rooms/{code}/start with x-admin-secret

## Operations
- Monitor in Application Insights (requests, dependencies, traces)
- Set alerts for Function errors and Web PubSub usage
- Scale up Redis if rate limiting or state grows
