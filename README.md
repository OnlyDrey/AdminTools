# AdminTools

AdminTools is a modern, simple, user-friendly desktop remote session manager for administrators and technical users.
It focuses on lightweight, local-first workflows for **RDP**, **SSH**, and **SFTP** with a cleaner UX and a practical MVP path.

## Windows setup before install

This is a **Windows 11 desktop application** built with Electron (not a web-only project).

Before running `npm install`, use a supported Node.js LTS lane:
- **Minimum required:** Node **22.12+**
- **Recommended baseline:** Node **22 LTS**
- **Newer Node versions:** allowed
- **Unsupported:** Node 21 and earlier Node versions

Check your current environment:

```powershell
node -v
npm -v
```

Read this first before installing:
- [Windows setup guide](./docs/windows-setup.md)

Quick repair helper (Windows PowerShell):

```powershell
npm run repair:env
```

## Why this stack

AdminTools uses **Electron + React + TypeScript** with Node.js runtime services because it gives:
- practical cross-platform support (Windows/Linux/macOS)
- fast iteration and maintainable UI development
- reliable integration for SSH/SFTP libraries
- a straightforward path to MVP RDP launch via external/system clients

## MVP features

- Session manager UI (create/edit/delete/duplicate)
- Protocol support:
  - Embedded SSH terminal using xterm.js
  - Embedded SFTP browser foundation
  - RDP launch through external/system client
- Portable encrypted vault (`admintools.vault.json`)
- Session organization:
  - folders
  - tags
  - favorites
  - recent sessions
  - global search
- UI:
  - dark mode
  - tabs
  - detachable windows
  - quick connect bar
  - keyboard shortcuts
- Import/export JSON (versioned schema)
- Seed/sample sessions included

## Project structure

- `src/main` Electron bootstrap, IPC, vault/config services, protocol launchers
- `src/renderer` React app and UI components
- `src/shared` shared types/schemas/constants
- `docs` supplemental documentation

## Getting started

### Prerequisites
- Node.js 22.12+ (recommended baseline: Node 22 LTS; newer Node versions allowed)
- npm 10+

### Install

```bash
npm install
```

### Run development app

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Encrypted vault/config model

AdminTools stores local data in `~/admintools.vault.json`.

The file includes:
- schema version
- app settings
- session list (metadata)
- encrypted secrets section
- KDF metadata

Security model (MVP):
- secrets are encrypted with AES-256-GCM
- key derived from master password via PBKDF2-SHA256
- vault is portable because all metadata and encrypted values are in one JSON file
- session metadata is plain JSON for easy portability, while credentials are encrypted

## RDP behavior in MVP

RDP is included but intentionally simple/reliable:
- save RDP sessions
- generate minimal profile parameters
- launch via system/external clients

Platform behavior:
- Windows: `mstsc`
- Linux: prefer `xfreerdp`, then `remmina`, then system handler
- macOS: use Microsoft Remote Desktop/system handler if installed, otherwise fallback behavior

**Embedded/advanced RDP is roadmap work, not solved in v1.**

## Remote host requirements

### Windows RDP
- Remote Desktop enabled
- firewall/network access to TCP 3389
- supported Windows edition and user permissions

### Linux SSH
- `openssh-server`

### Linux GUI via RDP (xrdp)
- `xrdp`
- `xorgxrdp` often needed
- KDE, Xfce, GNOME, Cinnamon, MATE, and similar desktops can work if host is configured correctly

Example package names:

Debian/Ubuntu:
- `openssh-server`
- `xrdp`
- `xorgxrdp`

Fedora/RHEL-like:
- `openssh-server`
- `xrdp`
- `xorgxrdp` (when applicable)

## Limitations in MVP

- RDP runs externally (not embedded)
- SFTP browser implements connect/list foundation and is ready for CRUD extensions
- No cloud sync
- No team/multi-user features
- No mRemoteNG/RDCMan import yet

## Roadmap

### Phase 1 – MVP
- session manager
- embedded SSH
- embedded SFTP
- external/system RDP launching
- encrypted portable vault
- dark mode
- tabs
- detachable windows
- search/tags/favorites/recent

### Phase 2 – Better RDP integration
- improved RDP profile generation
- reconnect improvements
- client detection improvements
- better window/resolution handling

### Phase 3 – Advanced RDP
- investigate embedded RDP engine options
- dynamic resolution updates
- smoother resize behavior
- improved session persistence

### Phase 4 – Advanced UX / ecosystem
- importers for mRemoteNG/RDCMan
- split panes
- saved layouts
- additional protocol support if needed

## Keyboard shortcuts

- `Ctrl/Cmd + K`: focus quick connect
- `Ctrl/Cmd + F`: focus search
- `Ctrl/Cmd + N`: new session form

## Future RDP plan

Advanced RDP work will focus on better profile generation, reconnect control, dynamic resolution planning, and potential embedded integration with a mature RDP engine after MVP stability.

## Windows 11 install troubleshooting

If `npm install` fails on Windows with `EBUSY/EPERM` cleanup errors or Electron TLS certificate errors, follow the recovery flow in `docs/windows-setup.md`.

Key points:
- use Node 22.12+ minimum (recommended baseline: Node 22 LTS; newer Node versions allowed); Node 21 is unsupported
- kill locking processes (`node`, `electron`, `esbuild`) before cleanup
- configure trusted corporate CA (`NODE_EXTRA_CA_CERTS` / `cafile`) instead of disabling SSL
- treat `strict-ssl=false` only as a temporary diagnostic
