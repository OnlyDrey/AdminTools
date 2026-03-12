# Native Rewrite: Getting Started (Windows 11)

This guide is the practical onboarding path for developing `admintools-native`.

## 1) Install required tools

### Visual Studio 2022
Install **Desktop development with C++** and ensure these are present:
- MSVC toolset (x64/x86)
- Windows 11 SDK
- CMake tools for Windows

### Qt 6
Install Qt 6.5+ with at least:
- Qt Core
- Qt Gui
- Qt Widgets

Use either:
- Qt Online Installer, or
- vcpkg/conan-based Qt distribution used by your team.

> If CMake cannot find Qt (`Qt6Config.cmake`), set `CMAKE_PREFIX_PATH` or `Qt6_DIR`.

Example:

```powershell
$env:CMAKE_PREFIX_PATH="C:\Qt\6.6.3\msvc2019_64"
```

## 2) Clone and configure

From repository root:

```powershell
cmake -S admintools-native -B out/native -G "Visual Studio 17 2022" -A x64
```

For explicit Debug config generation (optional):

```powershell
cmake -S admintools-native -B out/native-debug -G "Visual Studio 17 2022" -A x64 -DADMTOOLS_ENABLE_TESTS=ON
```

## 3) Build

```powershell
cmake --build out/native --config Debug
```

Release build:

```powershell
cmake --build out/native --config Release
```

## 4) Run the app

```powershell
.\out\native\src\Debug\AdminToolsNative.exe
```

On first launch, the app seeds a minimal sample vault under app-data for local testing.

## 5) Run tests

```powershell
ctest --test-dir out/native -C Debug --output-on-failure
```

Current test scope is foundational (model serialization roundtrip) and will expand in next milestones.

## 6) Daily dev workflow

1. Update native code under `admintools-native/src/*`.
2. Rebuild with CMake.
3. Launch the app and validate shell/workspace behavior.
4. Run tests.
5. Update docs in `admintools-native/docs/*` when architecture/flow changes.

## 7) Key directories

- `src/app` - startup/composition root
- `src/core` - domain models + serialization
- `src/ui` - native shell and workspace widgets
- `src/sessions` - session orchestration
- `src/storage` - vault/workspace persistence
- `src/platform/windows` - Windows APIs (credential store)
- `src/rdp`, `src/ssh`, `src/sftp` - protocol controllers/adapters
- `tests` - native test targets

## 8) Current known limitations (phase 1)

- Embedded RDP view is not yet implemented (external `mstsc` fallback is used).
- SSH/SFTP controllers are architecture-first stubs awaiting backend integration.
- Workspace restore is skeleton-level (capture implemented, full graph restore pending).

See detailed status: `feature-parity.md`.
