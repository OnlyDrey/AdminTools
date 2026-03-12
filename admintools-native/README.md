# AdminTools Native Rewrite (Qt 6 / C++)

This folder contains the first serious native Windows rewrite foundation for AdminTools.

## Why Qt 6 Widgets

Qt 6 Widgets is selected for phase 1 because it provides:

- mature desktop shell primitives (menus, toolbars, dock widgets, splitters, tabs)
- practical multi-pane and tabbed workspace implementation speed
- straightforward host integration path for Windows-native controls (including planned ActiveX-based RDP control hosting)
- CMake-first build flow compatible with Visual Studio on Windows 11

Qt Quick is intentionally deferred until shell/workspace behavior stabilizes.

## Build (Windows 11 + Visual Studio 2022)

```powershell
cmake -S admintools-native -B out/native -G "Visual Studio 17 2022" -A x64
cmake --build out/native --config Debug
out\native\src\Debug\AdminToolsNative.exe
```

## Scope in this milestone

- Native shell: menu, toolbar, navigation/sidebar docks, session list, central tab/pane workspace.
- Core domain models in C++ (`Session`, `CredentialProfile`, `FolderNode`, `SessionTemplate`, `WorkspaceState`, etc.).
- JSON persistence skeleton for vault/session metadata and workspace state.
- Windows credential storage abstraction via Credential Manager API.
- Protocol controllers with phase-1 implementations/stubs:
  - SSH path adapter (planned `libssh2` backend)
  - SFTP path adapter (planned native transfer backend)
  - RDP controller with honest capability reporting + external `mstsc` fallback

See `docs/` for architecture and migration planning details.
