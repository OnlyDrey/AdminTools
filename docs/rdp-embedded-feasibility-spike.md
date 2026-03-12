# Embedded RDP Feasibility Spike (Windows / Electron)

## Scope
This document captures a technical feasibility spike for embedded RDP in AdminTools.
It is **not** a production claim; current production fallback remains system RDP client launch.

## Options evaluated

### 1) FreeRDP-based native helper (recommended path)
- **Approach**: ship a Windows-native helper process (C++/Rust) that embeds FreeRDP and exposes IPC bridge to Electron.
- **Dynamic resize**: Strong (Display Update / dynamic resolution supported in modern FreeRDP paths).
- **Command injection**: Strong (CAD/Win keys can be routed through protocol input path where server allows).
- **Fullscreen in app**: Strong.
- **Clipboard sync**: Strong.
- **Stability**: Medium/High with proper watchdog + process isolation.
- **Packaging complexity**: High.
- **Windows 11 compatibility**: Good, requires robust signing/distribution pipeline.
- **Maintainability**: Medium (native surface area exists, but explicit adapter helps contain complexity).

### 2) MSTSC embedding / ActiveX legacy path
- **Approach**: host legacy RDP COM/ActiveX surface.
- **Dynamic resize**: Limited/fragile across modern constraints.
- **Command injection**: Partial.
- **Fullscreen in app**: Possible but legacy-heavy.
- **Clipboard sync**: Possible.
- **Stability**: Medium/Low over long-term on modern Electron.
- **Packaging complexity**: Medium.
- **Windows 11 compatibility**: Uncertain long-term.
- **Maintainability**: Low (legacy API risk).

### 3) WebView/browser-based RDP gateways
- **Approach**: use web gateway protocols (e.g., Guacamole-like bridge) in WebView.
- **Dynamic resize**: Depends on gateway.
- **Command injection**: Depends on gateway.
- **Fullscreen in app**: Good.
- **Clipboard sync**: Depends on gateway and policy.
- **Stability**: Medium.
- **Packaging complexity**: Medium/High (requires server component).
- **Windows 11 compatibility**: Good for client; external infra required.
- **Maintainability**: Medium (adds infrastructure dependency).

## Recommendation
Adopt **FreeRDP native helper process** behind an adapter boundary.

## Adapter boundary status in codebase
AdminTools currently keeps RDP behind a protocol-aware engine abstraction and command router:
- `src/renderer/remoteSessionEngine.ts`
- `src/renderer/remoteCommandRouter.ts`
- `src/renderer/components/RemoteView.tsx`

These boundaries already isolate:
- lifecycle (`connect/disconnect/reconnect`)
- surface behavior (`resize`, display modes)
- command routing/capability checks

## Incremental implementation plan
1. Add feature flag: `embeddedRdpEnabled` (off by default).
2. Implement native helper IPC contract:
   - create session
   - attach render surface
   - resize
   - inject keys
   - clipboard sync
   - disconnect/reconnect
3. Map helper events to shared connection states.
4. Keep system-client fallback when helper unavailable/fails.
5. Add diagnostics in activity log for helper failures (no secrets).

## Honest readiness statement
- Embedded RDP is **not production-ready** yet.
- Current work establishes a realistic integration path while preserving safe fallback.
