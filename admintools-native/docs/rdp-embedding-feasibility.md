# RDP Embedding Feasibility Notes

## Goal

Provide true in-pane RDP rendering for Windows-native AdminTools workspace tabs.

## Evaluated paths

### 1) MSTSC ActiveX (MsRdpClient) hosted in native window (preferred next step)

- Viability: High on Windows desktop.
- Benefits: mature Microsoft RDP client behavior, clipboard/device support potential, session lifecycle events.
- Integration path in this repo:
  - add a Windows-only RDP view module under `src/rdp`
  - host control through Qt ActiveQt bridge (`QAxWidget`) in a workspace tab pane
  - wire capability probing in `RdpController`

### 2) External mstsc process fallback

- Viability: Immediate.
- Already implemented in phase 1 via `QProcess::startDetached("mstsc", ...)`.
- Limitation: not embedded in workspace pane.

### 3) Custom protocol implementation

- Viability: Low for near-term timeline.
- Not selected for foundation milestone due to complexity and risk.

## Capability reporting contract

`RdpController::capabilities()` reports:

- embedded available/unavailable
- resize support
- command injection support
- clipboard support
- backend and notes

This is intentionally explicit so users can see real capability state instead of simulated embedding.
