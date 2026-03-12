# AdminTools Native Rewrite (Qt 6 / C++)

This folder contains the native Windows rewrite foundation for AdminTools.

## Standard setup/build flow (Windows 11)

Use the repo-level scripts as the canonical flow:

1. Bootstrap prerequisites:

```powershell
.\scripts\bootstrap-native.ps1
```

2. If prompted, approve install (`Y`).
3. If packages were newly installed, rerun bootstrap in a fresh terminal.
4. Build:

```powershell
.\scripts\build-native.ps1
```

5. Optional Release build:

```powershell
.\scripts\build-native.ps1 -Configuration Release
```

6. Run app:

```powershell
.\out\native\src\Debug\AdminToolsNative.exe
```

## Why rerun bootstrap after installs?

Newly installed tools (CMake/Build Tools) may not be discoverable in the current terminal session until environment refresh.

## References

- Setup checklist: [`../docs/native-windows-setup.md`](../docs/native-windows-setup.md)
- Native onboarding: [`docs/getting-started.md`](./docs/getting-started.md)
- Architecture: [`docs/architecture-overview.md`](./docs/architecture-overview.md)
- Migration plan: [`docs/migration-strategy.md`](./docs/migration-strategy.md)
- Feature parity: [`docs/feature-parity.md`](./docs/feature-parity.md)
