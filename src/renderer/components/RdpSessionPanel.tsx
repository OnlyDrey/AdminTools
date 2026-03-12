import type { ConnectionState, RdpLaunchResult, RdpSession } from '../../shared/types';

interface RdpSessionPanelProps {
  session: RdpSession;
  status: ConnectionState;
  launchInfo?: RdpLaunchResult;
  onReconnect: () => void;
  onDisconnect: () => void;
  onDetach: () => void;
  onSetDisplayMode: (mode: RdpSession['resolutionMode']) => void;
  onCopyHost: () => void;
  onCopyUsername: () => void;
}

export function RdpSessionPanel({
  session,
  status,
  launchInfo,
  onReconnect,
  onDisconnect,
  onDetach,
  onSetDisplayMode,
  onCopyHost,
  onCopyUsername
}: RdpSessionPanelProps) {
  const primaryLabel = status === 'connected' ? 'Reconnect' : 'Connect';

  return (
    <div className="rdp-panel">
      <header className="rdp-panel-header">
        <div>
          <h3>{session.name}</h3>
          <p className="muted">{session.host}:{session.port} • RDP</p>
        </div>
        <span className={`status-pill ${status}`}>{status}</span>
      </header>

      <section className="rdp-panel-actions row">
        <button className="primary" onClick={onReconnect}>{primaryLabel}</button>
        <button onClick={onDisconnect}>Disconnect</button>
        <button onClick={onDetach}>Detach</button>
        <button onClick={onCopyHost}>Copy host</button>
        <button onClick={onCopyUsername} disabled={!session.username}>Copy username</button>
      </section>

      <section className="rdp-panel-grid">
        <div className="card-like">
          <h4>Display</h4>
          <label className="muted">Display mode</label>
          <select value={session.resolutionMode} onChange={(e) => onSetDisplayMode(e.target.value as RdpSession['resolutionMode'])}>
            <option value="system">Fit to window</option>
            <option value="fixed">100%</option>
            <option value="fullscreen">Fullscreen intent</option>
          </select>
          <p className="muted">Dynamic resize is not available in external client mode. Use reconnect after resizing.</p>
        </div>

        <div className="card-like">
          <h4>Status</h4>
          <p className="muted">Mode: External client mode (mstsc)</p>
          <p className="muted">Embedded mode unavailable (planned)</p>
          <p className="muted">Credential status: {launchInfo?.credentialStatus ?? (session.credentialRef ? 'saved configured' : 'session username only')}</p>
          <p className="muted">Last launch: {launchInfo?.launchedAt ? new Date(launchInfo.launchedAt).toLocaleString() : 'Never'}</p>
          {launchInfo?.warning && <p className="warning-text">{launchInfo.warning}</p>}
          {launchInfo?.status === 'failed' && <p className="warning-text">{launchInfo.message}</p>}
        </div>
      </section>
    </div>
  );
}
