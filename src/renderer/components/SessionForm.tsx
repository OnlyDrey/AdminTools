import { useMemo, useState } from 'react';
import type { Protocol, Session } from '../../shared/types';

interface SessionFormProps {
  onSave: (session: Session) => Promise<void>;
  existing?: Session;
  onCancel?: () => void;
  title?: string;
}

export function SessionForm({ onSave, existing, onCancel, title }: SessionFormProps) {
  const [protocol, setProtocol] = useState<Protocol>(existing?.protocol ?? 'ssh');
  const [name, setName] = useState(existing?.name ?? '');
  const [host, setHost] = useState(existing?.host ?? '');
  const [port, setPort] = useState(existing?.port ?? (protocol === 'rdp' ? 3389 : 22));
  const [username, setUsername] = useState(existing?.username ?? '');

  const base = useMemo(
    () => ({
      id: existing?.id ?? crypto.randomUUID(),
      name,
      protocol,
      host,
      port,
      username,
      tags: existing?.tags ?? [],
      favorite: existing?.favorite ?? false,
      folder: existing?.folder,
      colorLabel: existing?.colorLabel,
      notes: existing?.notes,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),
    [existing, host, name, port, protocol, username]
  );

  const submit = async () => {
    if (protocol === 'rdp') {
      await onSave({
        ...base,
        protocol,
        resolutionMode: 'system',
        fullscreen: false,
        adminMode: false,
        clipboard: true,
        driveRedirection: false,
        sound: 'local'
      });
      return;
    }
    if (protocol === 'ssh') {
      await onSave({ ...base, protocol, terminalProfile: 'default' });
      return;
    }
    await onSave({ ...base, protocol, showHiddenFiles: false, remotePath: '/' });
  };

  return (
    <div className="card">
      <div className="row between">
        <h3>{title ?? (existing ? 'Edit session' : 'New session')}</h3>
        {onCancel && <button onClick={onCancel}>Close</button>}
      </div>
      <div className="form-grid">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Session name" />
        <select value={protocol} onChange={(e) => setProtocol(e.target.value as Protocol)}>
          <option value="rdp">RDP</option>
          <option value="ssh">SSH</option>
          <option value="sftp">SFTP</option>
        </select>
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host" />
        <input value={port} onChange={(e) => setPort(Number(e.target.value))} placeholder="Port" type="number" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      </div>
      <div className="row end">
        <button onClick={submit}>Save session</button>
      </div>
    </div>
  );
}
