# Native Windows Setup Checklist (AdminTools)

This setup is for the native rewrite in `admintools-native/`.

> The native app is still under active construction. Setup/build flow is being standardized around one bootstrap + build path.

## Prerequisite checklist

Minimum requirements:
- Windows 11
- `winget`
- CMake
- Visual Studio 2022 Build Tools **or** Visual Studio 2022 Community
- Desktop development with C++ workload
- MSVC v143 toolset
- Windows 10/11 SDK
- C++ CMake tools for Windows

## What the scripts do

- `scripts/bootstrap-native.ps1`
  - checks prerequisite status
  - prints `[OK]` / `[MISSING]` checklist
  - offers to install missing packages with confirmation (`Proceed with installation? [y/N]`)
  - can relaunch itself elevated once for installation
  - if new packages were installed, tells you to rerun bootstrap (PATH/tool discovery may not refresh immediately)

- `scripts/build-native.ps1`
  - verifies required tools are available
  - configures CMake using Visual Studio 2022 generator
  - builds the native project in Debug by default
  - supports `-Configuration`, `-Clean`, and `-Reconfigure`

## Recommended flow

1. Run bootstrap:

```powershell
.\scripts\bootstrap-native.ps1
```

2. If prompted, approve installation with `Y`.
3. If packages were installed, reopen terminal if needed and rerun bootstrap:

```powershell
.\scripts\bootstrap-native.ps1
```

4. Build native app:

```powershell
.\scripts\build-native.ps1
```

5. Optional Release build:

```powershell
.\scripts\build-native.ps1 -Configuration Release
```
