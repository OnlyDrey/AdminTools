# Next Milestone Recommendations

## Milestone 2: Protocol Reality

- Integrate `libssh2` and a terminal rendering component for true interactive SSH tabs.
- Implement SFTP dual-panel UI (local + remote) with operation queue/progress model.
- Add connection state machine updates into status bar and activity stream.

## Milestone 3: Embedded RDP

- Add Windows-only embedded RDP tab view using `MsRdpClient` ActiveX host.
- Expose connection options UI (resolution, audio, clipboard, drives).
- Add capability matrix in session details so users can inspect backend support.

## Milestone 4: Migration + Hardening

- Build production-grade importer from Electron vault/settings JSON.
- Add migration wizard and diagnostics report.
- Expand secure secret handling with DPAPI wrapping for any local cached tokens.
- Add unit/integration tests for serialization, workspace restore, and migration mapping.
