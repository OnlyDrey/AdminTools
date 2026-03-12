# Workspace + RDP Mode Milestone Notes

## What this milestone adds

- A pane-based workspace model with persisted pane layout and per-pane tabs.
- View-instance separation (`view id`) from session identity (`session id`) so the same SSH session can be opened in multiple simultaneous views.
- Split-right / split-down workflows in the main workspace shell.
- Focused pane handling and per-pane active tab behavior.
- RDP mode capability boundary for embedded-vs-external mode decisions.

## Workspace model

Workspace persistence now includes:

- `viewInstances[]` (session view instances)
- `layout.split` (`none | vertical | horizontal`)
- `layout.panes[]` with `tabIds`, `activeTabId`, `size`
- `layout.focusedPaneId`

This allows tabbed panes and split-pane hosting without changing session schema.

## Session surface architecture

- Session **entity**: connection target and metadata in vault.
- Session **view instance**: render/mount instance in a workspace pane.
- Pane **host**: tab container with active-tab selection and split layout placement.

This keeps the door open for detached-window hosting of the same view model later.

## RDP mode handling

Main process now exposes an explicit embedded capability probe (`rdp:embedded-capability`).

Current behavior:

- If no helper is present: use external client mode (`mstsc`) and show that explicitly.
- If helper is detected: mark embedded mode as available/experimental.

This keeps UI messaging honest while preserving fallback stability.

## What is still intentionally future work

- Production-ready embedded RDP rendering pipeline.
- Native helper process protocol for real framebuffer/input embedding.
- Robust pane drag-rearrangement and advanced docking behaviors.
