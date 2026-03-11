param(
  [switch]$KeepLockFile
)

$ErrorActionPreference = "Stop"

Write-Host "[AdminTools] Windows environment repair starting..." -ForegroundColor Cyan
Write-Host "1) Stopping common lock holders (node/electron/esbuild)..." -ForegroundColor Yellow
Get-Process node,electron,esbuild -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "2) Removing install artifacts..." -ForegroundColor Yellow
if (Test-Path .\node_modules) {
  Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
}
if (-not $KeepLockFile -and (Test-Path .\package-lock.json)) {
  Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue
}

Write-Host "3) Verifying npm cache..." -ForegroundColor Yellow
npm cache verify

if (Test-Path .\node_modules) {
  Write-Host "node_modules still exists, running fallback cleanup..." -ForegroundColor DarkYellow
  cmd /c rmdir /s /q node_modules
}

Write-Host "[AdminTools] Repair complete." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Confirm Node version is 22.12+ (recommended baseline: Node 22 LTS; newer Node versions allowed)" -ForegroundColor White
Write-Host "  - Configure corporate CA if needed (NODE_EXTRA_CA_CERTS / npm cafile)" -ForegroundColor White
Write-Host "  - Run: npm install" -ForegroundColor White
Write-Host "  - Run: npm run dev" -ForegroundColor White
