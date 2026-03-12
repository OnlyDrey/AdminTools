# AdminTools

AdminTools is being rewritten as a **native Windows 11 desktop application in C++**.

- **Primary implementation (active):** `admintools-native/` (Qt 6 + CMake + C++)
- **Legacy implementation (kept in parallel):** existing Electron + React + TypeScript app in repo root

## Native developer quickstart (standard flow)

1. Run prerequisite bootstrap:

```powershell
.\scripts\bootstrap-native.ps1
```

2. Approve installation with `Y` if prompted.
3. If bootstrap installed packages, reopen terminal if needed and rerun bootstrap.
4. Build native project:

```powershell
.\scripts\build-native.ps1
```

See full setup checklist and behavior notes:
- [`docs/native-windows-setup.md`](./docs/native-windows-setup.md)

See native project docs:
- [`admintools-native/README.md`](./admintools-native/README.md)
- [`admintools-native/docs/getting-started.md`](./admintools-native/docs/getting-started.md)

## Legacy Electron track

If you need to run the legacy Electron app, use:
- [`docs/windows-setup.md`](./docs/windows-setup.md)
