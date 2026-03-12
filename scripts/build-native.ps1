[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Debug',
    [switch]$Clean,
    [switch]$Reconfigure
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Path $PSScriptRoot -Parent
$sourceDir = Join-Path $projectRoot 'admintools-native'
$buildDir = Join-Path $projectRoot 'out/native'
$generator = 'Visual Studio 17 2022'

function Require-Command {
    param([string]$Name)

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $cmd) {
        Write-Error "$Name is not available. Run .\scripts\bootstrap-native.ps1 first."
        exit 1
    }

    return $cmd
}

Write-Host 'AdminTools Native Build' -ForegroundColor Cyan
Write-Host "Source: $sourceDir"
Write-Host "Build:  $buildDir"
Write-Host "Config: $Configuration"
Write-Host ''

Require-Command -Name 'cmake' | Out-Null

$helpText = (& cmake --help) -join "`n"
if ($helpText -notmatch [Regex]::Escape($generator)) {
    Write-Error "CMake does not list generator '$generator'. Install Visual Studio 2022 Build Tools (C++ workload) via .\scripts\bootstrap-native.ps1."
    exit 1
}

if ($Clean -and (Test-Path $buildDir)) {
    Write-Host "Cleaning build directory: $buildDir" -ForegroundColor Yellow
    Remove-Item -Recurse -Force $buildDir
}

$needsConfigure = $Reconfigure -or -not (Test-Path (Join-Path $buildDir 'CMakeCache.txt'))
if ($needsConfigure) {
    Write-Host 'Configuring project...' -ForegroundColor Cyan
    $configureCmd = @('cmake', '-S', $sourceDir, '-B', $buildDir, '-G', $generator, '-A', 'x64')
    Write-Host ('> ' + ($configureCmd -join ' '))
    & cmake -S $sourceDir -B $buildDir -G $generator -A x64
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Configure step failed.'
        exit $LASTEXITCODE
    }
}
else {
    Write-Host 'Skipping configure step (existing CMakeCache.txt found). Use -Reconfigure to force.' -ForegroundColor DarkYellow
}

Write-Host 'Building project...' -ForegroundColor Cyan
$buildCmd = @('cmake', '--build', $buildDir, '--config', $Configuration)
Write-Host ('> ' + ($buildCmd -join ' '))
& cmake --build $buildDir --config $Configuration
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Build step failed.'
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Build succeeded.' -ForegroundColor Green
$exePath = Join-Path $projectRoot "out/native/src/$Configuration/AdminToolsNative.exe"
Write-Host "Run app: $exePath"
Write-Host "Run tests: ctest --test-dir out/native -C $Configuration --output-on-failure"
