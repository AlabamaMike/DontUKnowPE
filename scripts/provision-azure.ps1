param(
  [string]$Subscription = '',
  [string]$ResourceGroup = 'dontuknowpe-prod-rg',
  [string]$Location = 'eastus',
  [string]$AdminSecret = ''
)

$ErrorActionPreference = 'Stop'

if ($Subscription) {
  az account set --subscription $Subscription | Out-Null
}
$subOut = az account show --query "{name:name,id:id}" -o tsv
Write-Host "Subscription: $subOut"

# Generate unique suffix for any creates we perform
$SUFFIX = Get-Random -Minimum 100000 -Maximum 999999
if (-not $AdminSecret) { $AdminSecret = [guid]::NewGuid().ToString() }

Write-Host "Target RG=$ResourceGroup LOC=$Location"

az config set extension.use_dynamic_install=yes_without_prompt extension.dynamic_install_allow_preview=true | Out-Null

# Ensure providers (register and wait until Registered)
$providers = @('Microsoft.Web','Microsoft.SignalRService','Microsoft.Cache')
foreach ($ns in $providers) { az provider register -n $ns | Out-Null }

$deadline = (Get-Date).AddMinutes(7)
while ($true) {
  $pending = @()
  foreach ($ns in $providers) {
    $state = az provider show -n $ns --query registrationState -o tsv 2>$null
    if ($state -ne 'Registered') { $pending += "$(($ns)):$(($state))" }
  }
  if ($pending.Count -eq 0) { break }
  if ((Get-Date) -gt $deadline) { Write-Host "Still pending: $($pending -join ', ')"; break }
  Start-Sleep -Seconds 10
}

az group create -n $ResourceGroup -l $Location -o none

# Discover existing resources (idempotency)
$stgName = az storage account list -g $ResourceGroup --query "[0].name" -o tsv
if (-not $stgName) {
  $stgName = "dontuknowpestg$SUFFIX"
  az storage account create -n $stgName -g $ResourceGroup -l $Location --sku Standard_LRS --kind StorageV2 -o none
  Write-Host "Created storage: $stgName"
} else { Write-Host "Using existing storage: $stgName" }

# Wait for storage provisioning to complete
$deadlineStorage = (Get-Date).AddMinutes(5)
while ($true) {
  $state = az storage account show -n $stgName -g $ResourceGroup --query provisioningState -o tsv 2>$null
  if ($state -eq 'Succeeded') { break }
  if ((Get-Date) -gt $deadlineStorage) { throw "Timeout waiting for storage $stgName provisioning (state=$state)" }
  Start-Sleep -Seconds 5
}

$funcName = az functionapp list -g $ResourceGroup --query "[0].name" -o tsv
if (-not $funcName) {
  $funcName = "dontuknowpe-func-$SUFFIX"
  az functionapp create `
    --name $funcName `
    --resource-group $ResourceGroup `
    --consumption-plan-location $Location `
    --runtime node `
    --runtime-version 20 `
    --functions-version 4 `
    --storage-account $stgName `
    --os-type Linux -o none
  Write-Host "Created Function App: $funcName"
} else { Write-Host "Using existing Function App: $funcName" }

# Confirm Function App exists
$deadlineFunc = (Get-Date).AddMinutes(5)
while ($true) {
  $host = az functionapp show -n $funcName -g $ResourceGroup --query defaultHostName -o tsv 2>$null
  if ($host -and $host -ne '') { break }
  if ((Get-Date) -gt $deadlineFunc) { throw "Timeout verifying Function App $funcName" }
  Start-Sleep -Seconds 5
}

$wpsName = az webpubsub list -g $ResourceGroup --query "[0].name" -o tsv
if (-not $wpsName) {
  $wpsName = "dontuknowpe-wps-$SUFFIX"
  az webpubsub create -n $wpsName -g $ResourceGroup -l $Location --sku Standard_S1 --unit-count 1 -o none
  Write-Host "Created Web PubSub: $wpsName"
} else { Write-Host "Using existing Web PubSub: $wpsName" }

$redisName = az redis list -g $ResourceGroup --query "[0].name" -o tsv
if (-not $redisName) {
  $redisName = "dontuknowpe-redis-$SUFFIX"
  az redis create -n $redisName -g $ResourceGroup -l $Location --sku Basic --vm-size c0 -o none
  Write-Host "Created Redis: $redisName"
} else { Write-Host "Using existing Redis: $redisName" }

Start-Sleep -Seconds 20

$WPS_CONN = az webpubsub key show -n $wpsName -g $ResourceGroup --query primaryConnectionString -o tsv
$REDIS_KEY = az redis list-keys -n $redisName -g $ResourceGroup --query primaryKey -o tsv
$REDIS_HOST = az redis show -n $redisName -g $ResourceGroup --query hostName -o tsv
$REDIS_CONN = "rediss://:$REDIS_KEY@$REDIS_HOST:6380/0"

az functionapp config appsettings set -n $funcName -g $ResourceGroup --settings `
  WebPubSubConnectionString=$WPS_CONN `
  WEBPUBSUB_HUB=rooms `
  RedisConnectionString=$REDIS_CONN `
  ADMIN_START_SECRET=$AdminSecret -o table | Out-Host

$FUNC_HOST = az functionapp show -n $funcName -g $ResourceGroup --query defaultHostName -o tsv

Write-Host "--- Outputs ---"
Write-Host "Resource Group: $ResourceGroup"
Write-Host "Function App: $funcName (https://$FUNC_HOST)"
Write-Host "Web PubSub: $wpsName"
Write-Host "Redis: $redisName"
Write-Host "Storage: $stgName"
Write-Host "ADMIN_START_SECRET: $AdminSecret"
Write-Host "Event Handler URL: https://$FUNC_HOST/runtime/webhooks/webpubsub?code=<SYSTEM_KEY>&hub=rooms"
