# Native Rewrite: Getting Started (Windows 11)

This project is under active construction, and the setup path is intentionally standardized.

## Use this flow

1. Run prerequisite bootstrap:

```powershell
.\scripts\bootstrap-native.ps1
```

2. Confirm package installation with `Y` when prompted.
3. If anything was installed, reopen terminal if needed and rerun bootstrap.
4. Build:

```powershell
.\scripts\build-native.ps1
```

5. Run:

```powershell
.\out\native\src\Debug\AdminToolsNative.exe
```

## Build options

```powershell
.\scripts\build-native.ps1 -Configuration Release
.\scripts\build-native.ps1 -Clean
.\scripts\build-native.ps1 -Reconfigure
```

## If bootstrap cannot fully configure Visual Studio workloads

Open Visual Studio Installer and ensure:
- Desktop development with C++
- MSVC v143
- Windows 10/11 SDK
- C++ CMake tools for Windows

## More details

- Setup checklist and script behavior: [`../../docs/native-windows-setup.md`](../../docs/native-windows-setup.md)
- Architecture overview: [`architecture-overview.md`](./architecture-overview.md)
- Feature status: [`feature-parity.md`](./feature-parity.md)
