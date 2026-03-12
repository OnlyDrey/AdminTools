# Feature Parity Tracking

## Implemented in this milestone

- Native app process and main shell window
- Menu/toolbar/navigation/session list shell structure
- Search filter in session list
- Workspace tabs in pane host
- Split right / split down actions with resizable panes
- Basic workspace state capture + persistence hook
- Domain models for sessions/folders/credentials/templates/workspace/activity/diagnostics
- JSON vault persistence skeleton
- Windows Credential Manager integration abstraction
- RDP capability reporting + external fallback launch
- SSH/SFTP controller adapter surfaces and compile-safe stubs

## Stubbed / partial

- Smart view query execution
- Full pane graph persistence/restore
- Move tab between panes command
- Terminal emulator rendering for SSH
- Dual-panel SFTP UI
- Embedded RDP surface
- Detailed activity stream and connection diagnostics UI

## Planned next

1. Add true tab transfer between panes + focused pane tracking model updates.
2. Implement libssh2 backend and terminal widget integration.
3. Build native dual-panel SFTP view with transfer progress model.
4. Implement Windows-only embedded RDP view using ActiveX host.
5. Add vault importer from Electron JSON schema + migration report UI.
6. Wire DPAPI-based optional extra secret protection layer.
