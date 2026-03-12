import { useMemo, useState } from 'react';
import type { ActivityEvent, Protocol } from '../../shared/types';

interface ActivityLogPanelProps {
  events: ActivityEvent[];
  onClear: () => Promise<void>;
}

export function ActivityLogPanel({ events, onClear }: ActivityLogPanelProps) {
  const [query, setQuery] = useState('');
  const [protocol, setProtocol] = useState<'all' | Protocol>('all');
  const [eventType, setEventType] = useState<'all' | ActivityEvent['eventType']>('all');

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const q = `${event.sessionName ?? ''} ${event.targetHost ?? ''} ${event.message}`.toLowerCase();
      if (protocol !== 'all' && event.protocol !== protocol) return false;
      if (eventType !== 'all' && event.eventType !== eventType) return false;
      return q.includes(query.toLowerCase());
    });
  }, [events, eventType, protocol, query]);

  return (
    <section className="card">
      <div className="row between">
        <h3>Activity</h3>
        <div className="row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search host/session" />
          <select value={protocol} onChange={(e) => setProtocol(e.target.value as 'all' | Protocol)}>
            <option value="all">All protocols</option>
            <option value="rdp">RDP</option>
            <option value="ssh">SSH</option>
            <option value="sftp">SFTP</option>
          </select>
          <select value={eventType} onChange={(e) => setEventType(e.target.value as 'all' | ActivityEvent['eventType'])}>
            <option value="all">All events</option>
            {['session_connected', 'session_disconnected', 'reconnect_attempted', 'authentication_failed', 'file_uploaded', 'file_downloaded', 'session_created', 'session_edited', 'credential_created', 'credential_updated', 'credential_deleted', 'quick_connect_used'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button onClick={() => onClear()}>Clear log</button>
          <button onClick={() => {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'admintools-activity-log.json';
            link.click();
            URL.revokeObjectURL(link.href);
          }}>Export</button>
        </div>
      </div>
      <div className="session-list">
        {filtered.map((event) => (
          <div key={event.id} className="session-row">
            <div>
              <strong>{event.eventType}</strong>
              <p className="muted">{event.protocol?.toUpperCase() ?? 'APP'} • {event.targetHost ?? 'n/a'} • {new Date(event.timestamp).toLocaleString()}</p>
              <p className="muted">{event.message}</p>
            </div>
            <span className={event.status === 'error' ? 'session-chip' : event.status === 'warning' ? 'session-chip warning' : 'session-chip ok'}>{event.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
