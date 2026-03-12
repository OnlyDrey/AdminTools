import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '../../shared/types';
import type { DisplayMode } from '../remoteSessionEngine';
import { createRemoteSessionEngine } from '../remoteSessionEngine';

interface RemoteViewProps {
  session: Session;
  children: ReactNode;
}

export function RemoteView({ session, children }: RemoteViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engine = useMemo(() => createRemoteSessionEngine(session), [session]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fit');
  const [showReconnectAtSize, setShowReconnectAtSize] = useState(false);
  const [pendingSize, setPendingSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    engine.connect().catch(() => undefined);
    return () => {
      engine.disconnect().catch(() => undefined);
    };
  }, [engine]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let timeoutId: number | undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        if (engine.supportsDynamicResize) {
          engine.resize(width, height).catch(() => undefined);
          setShowReconnectAtSize(false);
          setPendingSize(null);
        } else {
          setShowReconnectAtSize(true);
          setPendingSize({ width, height });
        }
      }, 300);
    });

    observer.observe(host);
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      observer.disconnect();
    };
  }, [engine]);

  const viewClass = displayMode === 'stretch' ? 'remote-surface stretch' : displayMode === 'actual' ? 'remote-surface actual' : 'remote-surface fit';

  return (
    <div className="remote-view">
      <div className="remote-view-controls row">
        <label className="muted">Display mode</label>
        <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}>
          <option value="fit">Fit to window</option>
          <option value="actual">100%</option>
          <option value="stretch">Stretch</option>
          <option value="fullscreen">Fullscreen</option>
        </select>
      </div>

      {showReconnectAtSize && (
        <div className="remote-resize-warning row between">
          <span className="muted">Dynamic resize not supported for this protocol.</span>
          <button onClick={() => engine.reconnect().catch(() => undefined)}>
            Reconnect at new resolution{pendingSize ? ` (${pendingSize.width}×${pendingSize.height})` : ''}
          </button>
        </div>
      )}

      <div ref={hostRef} className={viewClass}>
        {displayMode === 'fullscreen' ? (
          <button className="fullscreen-btn" onClick={() => hostRef.current?.requestFullscreen().catch(() => undefined)}>Enter fullscreen</button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
