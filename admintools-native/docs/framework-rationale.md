# Framework Choice Rationale

## Decision

Use **Qt 6 Widgets** for the native rewrite foundation.

## Why this fits AdminTools now

- Fast path to dense, professional desktop shell patterns (dock windows, splitters, tabs, lists, menus).
- Excellent CMake + Visual Studio support for Windows 11 teams.
- Keeps app entirely native C++ with no Electron/Node runtime dependency.
- Provides realistic Windows integration points for Credential Manager and RDP control hosting.
- Lower risk for phase-1 than WinUI 3 interop complexity while still allowing native look/behavior tuning.

## Why not WinUI 3 in this milestone

WinUI 3 is viable long-term, but this rewrite needs immediate parity on complex dock/tab/pane workflows and protocol surface wiring. Qt Widgets gets us there faster with lower implementation risk.

## Why not pure Win32 now

A full custom Win32 shell would consume milestone time on UI plumbing instead of session architecture and protocol priorities.
