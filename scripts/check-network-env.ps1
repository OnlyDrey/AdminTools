$ErrorActionPreference = "Stop"

Write-Host "[AdminTools] Windows network/TLS environment check" -ForegroundColor Cyan
Write-Host ""

Write-Host "Versions" -ForegroundColor Yellow
node -v
npm -v

Write-Host ""
Write-Host "npm TLS / proxy config" -ForegroundColor Yellow
Write-Host ("strict-ssl: " + (npm config get strict-ssl))
Write-Host ("cafile: " + (npm config get cafile))
Write-Host ("proxy: " + (npm config get proxy))
Write-Host ("https-proxy: " + (npm config get https-proxy))

Write-Host ""
Write-Host "Environment variables" -ForegroundColor Yellow
if ($env:NODE_USE_SYSTEM_CA) {
  Write-Host ("NODE_USE_SYSTEM_CA: " + $env:NODE_USE_SYSTEM_CA)
} else {
  Write-Host "NODE_USE_SYSTEM_CA is not set." -ForegroundColor DarkYellow
}

if ($env:NODE_EXTRA_CA_CERTS) {
  Write-Host ("NODE_EXTRA_CA_CERTS: " + $env:NODE_EXTRA_CA_CERTS)
  if (Test-Path $env:NODE_EXTRA_CA_CERTS) {
    Write-Host "NODE_EXTRA_CA_CERTS path exists." -ForegroundColor Green
  } else {
    Write-Host "NODE_EXTRA_CA_CERTS is set but path does not exist." -ForegroundColor Red
  }
} else {
  Write-Host "NODE_EXTRA_CA_CERTS is not set." -ForegroundColor DarkYellow
}

if ($env:ELECTRON_GET_USE_PROXY) {
  Write-Host ("ELECTRON_GET_USE_PROXY: " + $env:ELECTRON_GET_USE_PROXY)
} else {
  Write-Host "ELECTRON_GET_USE_PROXY is not set (usually fine unless your network requires explicit proxy behavior)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Interpretation" -ForegroundColor Yellow
Write-Host "- If npm install fails with 'unable to get local issuer certificate', the main blocker is usually certificate/proxy trust in the environment, not package.json." -ForegroundColor White
Write-Host "- EPERM/EBUSY cleanup warnings are typically secondary unless install still fails after trust is correctly configured." -ForegroundColor White

Write-Host ""
Write-Host "Next actions" -ForegroundColor Cyan
Write-Host "1) Ensure strict-ssl stays true." -ForegroundColor White
Write-Host "2) Option B first (if supported): set NODE_USE_SYSTEM_CA=1 and retry." -ForegroundColor White
Write-Host "3) Option A fallback: set NODE_EXTRA_CA_CERTS to corporate PEM chain." -ForegroundColor White
Write-Host "4) Optionally set npm cafile to the same PEM path." -ForegroundColor White
Write-Host "5) Configure proxy/https-proxy if your environment requires it." -ForegroundColor White
Write-Host "6) Run npm run repair:env then npm install." -ForegroundColor White
