# AdminTools

AdminTools is being rewritten as a **native Windows 11 desktop application in C++**.

- **Primary implementation (active):** `admintools-native/` (Qt 6 + CMake + C++)
- **Legacy implementation (kept in parallel):** existing Electron + React + TypeScript app in repo root

This repository now contains both tracks so we can migrate safely without losing workflows.

## Start here

### If you are working on the native rewrite (recommended)
1. Read [`admintools-native/README.md`](./admintools-native/README.md).
2. Follow the full native onboarding guide: [`admintools-native/docs/getting-started.md`](./admintools-native/docs/getting-started.md).
3. Review native architecture and roadmap docs under [`admintools-native/docs/`](./admintools-native/docs).

### If you need to run the legacy Electron app
- Use the setup steps in [`docs/windows-setup.md`](./docs/windows-setup.md).
- Treat Electron as compatibility/transition track while native milestones land.

## Native rewrite goals

The native rewrite is focused on:
- native Windows desktop shell (no Electron runtime dependency)
- session-centric architecture in C++
- tabbed + split-pane workspace model
- Windows-native credential handling
- RDP-first strategy with honest embedded feasibility path
- phased migration from current vault/settings model

For implementation status and parity tracking see:
- [`admintools-native/docs/feature-parity.md`](./admintools-native/docs/feature-parity.md)
- [`admintools-native/docs/migration-strategy.md`](./admintools-native/docs/migration-strategy.md)
- [`admintools-native/docs/rdp-embedding-feasibility.md`](./admintools-native/docs/rdp-embedding-feasibility.md)
