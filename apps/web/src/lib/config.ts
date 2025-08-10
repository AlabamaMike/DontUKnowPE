export function getApiBase() {
  return import.meta.env.VITE_API_BASE || '/api'
}

export function getWsBase() {
  const def = `${location.origin.replace('http', 'ws')}/api`
  return import.meta.env.VITE_WS_BASE || def
}

export function isAzureWps() {
  // Default to Azure Web PubSub mode unless explicitly disabled
  return import.meta.env.VITE_AZURE_WPS !== 'false'
}
