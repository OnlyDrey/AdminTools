[CmdletBinding()]
param(
    [switch]$InstallMissing,
    [switch]$ElevatedPhase
)

$ErrorActionPreference = 'Stop'

function Write-Status {
    param(
        [string]$Label,
        [bool]$IsOk,
        [string]$Detail = ''
    )

    $prefix = if ($IsOk) { '[OK]' } else { '[MISSING]' }
    if ([string]::IsNullOrWhiteSpace($Detail)) {
        Write-Host "$prefix $Label"
    }
    else {
        Write-Host "$prefix $Label - $Detail"
    }
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-VSWherePath {
    $path = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (Test-Path $path) {
        return $path
    }

    return $null
}

function Get-VSInstance {
    param(
        [string]$VswherePath,
        [string[]]$Requires = @()
    )

    if (-not $VswherePath) {
        return $null
    }

    $args = @(
        '-products', 'Microsoft.VisualStudio.Product.BuildTools', 'Microsoft.VisualStudio.Product.Community',
        '-version', '[17.0,18.0)',
        '-format', 'json'
    )

    foreach ($require in $Requires) {
        $args += @('-requires', $require)
    }

    $json = & $VswherePath @args 2>$null
    if (-not $json) {
        return $null
    }

    $instances = $json | ConvertFrom-Json
    if ($instances -is [Array] -and $instances.Count -gt 0) {
        return $instances[0]
    }

    return $null
}

Write-Host 'AdminTools Native Bootstrap (Windows prerequisites)' -ForegroundColor Cyan
Write-Host ''

$wingetCommand = Get-Command winget -ErrorAction SilentlyContinue
$cmakeCommand = Get-Command cmake -ErrorAction SilentlyContinue
$vswherePath = Get-VSWherePath
$vsInstanceAny = Get-VSInstance -VswherePath $vswherePath
$vsCppInstance = Get-VSInstance -VswherePath $vswherePath -Requires @(
    'Microsoft.VisualStudio.Workload.VCTools',
    'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
    'Microsoft.VisualStudio.Component.VC.CMake.Project'
)

$statuses = @(
    @{ Label = 'Windows 11'; IsOk = $true; Detail = 'Manual check required in this script.' },
    @{ Label = 'winget'; IsOk = ($null -ne $wingetCommand); Detail = '' },
    @{ Label = 'CMake'; IsOk = ($null -ne $cmakeCommand); Detail = '' },
    @{ Label = 'Visual Studio 2022 Build Tools/Community'; IsOk = ($null -ne $vsInstanceAny); Detail = '' },
    @{ Label = 'Desktop development with C++ workload + MSVC/CMake tools'; IsOk = ($null -ne $vsCppInstance); Detail = 'Expected workload/components were not fully detected.' }
)

Write-Host 'Prerequisite checklist:' -ForegroundColor Yellow
foreach ($status in $statuses) {
    Write-Status -Label $status.Label -IsOk $status.IsOk -Detail $status.Detail
}
Write-Host ''

$missingItems = @($statuses | Where-Object { -not $_.IsOk })
if ($missingItems.Count -eq 0) {
    Write-Host 'All required prerequisites were detected.' -ForegroundColor Green
    Write-Host 'Next step: run .\scripts\build-native.ps1'
    exit 0
}

$canAutoInstall = $null -ne $wingetCommand
$installPlan = @()

if ($null -eq $cmakeCommand -and $canAutoInstall) {
    $installPlan += @{ Id = 'Kitware.CMake'; Args = @('--accept-package-agreements', '--accept-source-agreements') }
}

if (($null -eq $vsInstanceAny -or $null -eq $vsCppInstance) -and $canAutoInstall) {
    $vsOverride = '--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
    $installPlan += @{ Id = 'Microsoft.VisualStudio.2022.BuildTools'; Args = @('--accept-package-agreements', '--accept-source-agreements', '--override', $vsOverride) }
}

if (-not $canAutoInstall) {
    Write-Warning 'winget is missing, so automatic installation is unavailable. Install missing prerequisites manually and rerun this script.'
    exit 1
}

if ($installPlan.Count -eq 0) {
    Write-Warning 'Prerequisites are missing, but no automatic install plan could be formed. Install requirements manually and rerun this script.'
    exit 1
}

Write-Host 'The following packages are missing and can be installed:' -ForegroundColor Yellow
foreach ($pkg in $installPlan) {
    Write-Host "- $($pkg.Id)"
}
Write-Host ''
Write-Host 'For Visual Studio Build Tools, C++ workload/components are requested with the installer override.'
Write-Host 'If component detection still fails afterward, open Visual Studio Installer and enable:'
Write-Host '  - Desktop development with C++'
Write-Host '  - MSVC v143 build tools'
Write-Host '  - Windows 10/11 SDK'
Write-Host '  - C++ CMake tools for Windows'
Write-Host ''

if (-not $InstallMissing) {
    $confirmation = Read-Host 'Proceed with installation? [y/N]'
    if ($confirmation -notin @('y', 'Y')) {
        Write-Host 'Installation cancelled by user.'
        exit 1
    }

    $InstallMissing = $true
}

if ($InstallMissing -and -not (Test-IsAdmin)) {
    Write-Host 'Installation requires administrator privileges. Relaunching once with elevation...' -ForegroundColor Yellow
    $argList = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', ('"{0}"' -f $PSCommandPath),
        '-InstallMissing',
        '-ElevatedPhase'
    )

    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList ($argList -join ' ')
    Write-Host 'Elevated installer was launched. Return to that window to continue.'
    exit 0
}

$installedAny = $false
foreach ($pkg in $installPlan) {
    Write-Host "Installing $($pkg.Id)..." -ForegroundColor Cyan
    & winget install --id $pkg.Id --exact @($pkg.Args)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install $($pkg.Id)."
        exit $LASTEXITCODE
    }

    $installedAny = $true
}

if ($installedAny) {
    Write-Host ''
    Write-Host 'Required packages were installed.' -ForegroundColor Green
    Write-Host 'Please close and reopen your terminal if needed, then run this script again before building.' -ForegroundColor Yellow
    exit 0
}

Write-Host 'No packages were installed.'
exit 0
