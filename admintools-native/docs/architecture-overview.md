# Native Architecture Overview

## Solution layout

- `src/app` - process startup and composition root
- `src/core` - domain models and serialization
- `src/ui` - native Qt Widgets shell and workspace controls
- `src/sessions` - session lifecycle orchestration
- `src/rdp` - RDP capability and launch strategy
- `src/ssh` - SSH connection abstraction (libssh2 target)
- `src/sftp` - SFTP abstraction and file operation contract
- `src/storage` - vault/workspace persistence and migration bridge points
- `src/platform/windows` - Windows-only APIs (Credential Manager now, DPAPI extensions next)

## Domain separation

The rewrite separates:

1. Session definition (`core::Session`)
2. Active runtime connection state (`ConnectionState`, `ConnectionDiagnostic`, controllers)
3. Session view host (`ui::WorkspaceWidget` tabs/panes)
4. Workspace persistence (`core::WorkspaceState` + `storage::WorkspaceStateStore`)

This allows multiple views for similar resources later (e.g., two SSH shells against one session definition).

## UI shell model

`ui::MainWindow` provides:

- top menu + action toolbar
- left dock navigation tree
- session list dock with inline search filtering
- central workspace with tabbed panes and split actions
- status bar event feedback

## Protocol strategy

- SSH: `ssh::SshController` is a stable adapter surface; backend implementation lands in a follow-up milestone using `libssh2` and a terminal rendering widget.
- SFTP: `sftp::SftpController` defines transfer/listing contract with local/remote panel-ready semantics.
- RDP: `rdp::RdpController` reports capability state and performs external fallback; planned next step is embedded hosting via Windows-native control bridge.
