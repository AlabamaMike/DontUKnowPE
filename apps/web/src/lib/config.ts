export function getApiBase() {
  return import.meta.env.VITE_API_BASE || '/api'
}

export function getWsBase() {
  const def = `${location.origin.replace('http', 'ws')}/api`
  return import.meta.env.VITE_WS_BASE || def
}

export function isAzureWps() {
  return Boolean(import.meta.env.VITE_AZURE_WPS)
}
