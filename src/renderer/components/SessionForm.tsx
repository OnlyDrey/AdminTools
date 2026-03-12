import { useEffect, useMemo, useState } from 'react';
import type { CredentialProfile, Protocol, Session, SessionOsType, SessionTemplate } from '../../shared/types';
import { detectOsType, getSessionMetaLabel, resolveSessionIcon } from '../sessionIcons';

interface SessionFormProps {
  onSave: (session: Session) => Promise<void>;
  existing?: Session;
  onCancel?: () => void;
  title?: string;
  credentials: CredentialProfile[];
  templates: SessionTemplate[];
  onManageCredentials: () => void;
  onRememberCredential: (payload: { name: string; username: string; password: string; domain?: string; protocol: Protocol }) => Promise<string>;
  onSaveAndConnect?: (session: Session) => Promise<void>;
}

const defaultPortByProtocol: Record<Protocol, number> = { rdp: 3389, ssh: 22, sftp: 22 };

function sortCredentials(credentials: CredentialProfile[], protocol: Protocol, folder: string, host: string) {
  const expectedType = protocol === 'rdp' ? 'windows' : protocol === 'ssh' || protocol === 'sftp' ? 'linux' : 'generic';
  const hostHint = host.toLowerCase();
  return [...credentials].sort((a, b) => {
    const score = (item: CredentialProfile) => {
      let s = 0;
      if (item.favorite) s += 50;
      if (item.type === expectedType) s += 20;
      if (folder && (item.tags ?? []).some((t) => t.toLowerCase() === folder.toLowerCase())) s += 10;
      if (hostHint && item.name.toLowerCase().includes(hostHint)) s += 8;
      if (item.lastUsed) s += 5;
      return s;
    };
    return score(b) - score(a);
  });
}

export function SessionForm({ onSave, existing, onCancel, title, credentials, templates, onManageCredentials, onRememberCredential, onSaveAndConnect }: SessionFormProps) {
  const [protocol, setProtocol] = useState<Protocol>(existing?.protocol ?? 'ssh');
  const [name, setName] = useState(existing?.name ?? '');
  const [host, setHost] = useState(existing?.host ?? '');
  const [port, setPort] = useState(existing?.port ?? defaultPortByProtocol[existing?.protocol ?? 'ssh']);
  const [folder, setFolder] = useState(existing?.folder ?? '');
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [domain, setDomain] = useState(existing?.protocol === 'rdp' ? (existing.domain ?? '') : '');
  const [resolutionMode, setResolutionMode] = useState(existing?.protocol === 'rdp' ? existing.resolutionMode : 'system');
  const [showAdvanced, setShowAdvanced] = useState(Boolean(existing));
  const [portMode, setPortMode] = useState<'auto' | 'custom'>(existing ? 'custom' : 'auto');
  const [credentialSelection, setCredentialSelection] = useState(existing?.credentialRef ?? 'one-time');
  const [oneTimeUsername, setOneTimeUsername] = useState(existing?.username ?? '');
  const [oneTimePassword, setOneTimePassword] = useState('');
  const [rememberCredential, setRememberCredential] = useState(false);
  const [osMode, setOsMode] = useState<'auto' | 'manual'>(existing?.osType ? 'manual' : 'auto');
  const [manualOsType, setManualOsType] = useState<SessionOsType>(existing?.osType ?? 'unknown');
  const [iconMode, setIconMode] = useState<'auto' | 'custom'>(existing?.iconMode ?? 'auto');
  const [customIcon, setCustomIcon] = useState(existing?.customIcon ?? '');
  const [uploadedIconDataUrl, setUploadedIconDataUrl] = useState(existing?.uploadedIconDataUrl ?? '');
  const [warning, setWarning] = useState('');
  const [templateId, setTemplateId] = useState('');

  useEffect(() => {
    if (!name.trim() && host.trim()) setName(host.trim());
  }, [host, name]);

  const detectedOs = useMemo(() => detectOsType(host, protocol), [host, protocol]);
  const effectiveOs = osMode === 'manual' ? manualOsType : detectedOs;
  const sortedCredentials = useMemo(() => sortCredentials(credentials, protocol, folder, host), [credentials, folder, host, protocol]);
  const selectedCredential = sortedCredentials.find((item) => item.id === credentialSelection);

  useEffect(() => {
    if (credentialSelection !== 'one-time' && !selectedCredential) {
      setWarning('Selected credential is missing. Choose another credential or one-time login.');
    } else if (protocol === 'rdp' && selectedCredential && selectedCredential.type !== 'windows') {
      setWarning('RDP usually expects a Windows credential type.');
    } else if (credentialSelection === 'one-time' && !oneTimeUsername.trim()) {
      setWarning('Username is required for one-time credential.');
    } else {
      setWarning('');
    }
  }, [credentialSelection, selectedCredential, protocol, oneTimeUsername]);


  const applyTemplate = (selectedTemplateId: string) => {
    setTemplateId(selectedTemplateId);
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    setProtocol(template.protocol);
    setPort(template.defaultPort);
    setPortMode('custom');
    if (template.defaultCredentialRef) {
      setCredentialSelection(template.defaultCredentialRef);
    }
    if (template.osType) {
      setOsMode('manual');
      setManualOsType(template.osType);
    }
    if (template.tags?.length) {
      setTags(template.tags.join(', '));
    }
    if (template.folderId) {
      setFolder(template.folderId);
    }
    if (template.notes) {
      setNotes(template.notes);
    }
  };

  const onProtocolChange = (next: Protocol) => {
    setProtocol(next);
    if (portMode === 'auto') setPort(defaultPortByProtocol[next]);
    if (next !== 'rdp') {
      setDomain('');
      setResolutionMode('system');
    }
  };

  const handlePortChange = (value: string) => {
    setPortMode('custom');
    const parsed = Number(value);
    setPort(Number.isFinite(parsed) ? parsed : defaultPortByProtocol[protocol]);
  };

  const base = useMemo(
    () => ({
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      protocol,
      host: host.trim(),
      port,
      username: selectedCredential?.username ?? oneTimeUsername.trim(),
      credentialRef: selectedCredential?.id,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      favorite: existing?.favorite ?? false,
      folder: folder.trim() || undefined,
      colorLabel: existing?.colorLabel,
      notes: notes.trim() || undefined,
      osType: effectiveOs,
      iconMode,
      customIcon: iconMode === 'custom' ? customIcon.trim() || undefined : undefined,
      uploadedIconDataUrl: iconMode === 'custom' ? uploadedIconDataUrl || undefined : undefined,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),
    [existing, folder, host, name, notes, oneTimeUsername, port, protocol, selectedCredential, tags, effectiveOs, iconMode, customIcon, uploadedIconDataUrl]
  );

  const persist = async (connectAfterSave = false) => {
    if (!base.name || !base.host || !base.username || warning) return;
    let credentialRef = base.credentialRef;
    let username = base.username;

    if (credentialSelection === 'one-time' && rememberCredential && oneTimePassword) {
      credentialRef = await onRememberCredential({
        name: `${base.name} credential`,
        username: oneTimeUsername.trim(),
        password: oneTimePassword,
        domain: domain.trim() || undefined,
        protocol
      });
      username = oneTimeUsername.trim();
    }

    if (protocol === 'rdp') {
      const session = { ...base, username, credentialRef, protocol, domain: domain.trim() || undefined, resolutionMode, fullscreen: false, adminMode: false, clipboard: true, driveRedirection: false, sound: 'local' } as Session;
      if (connectAfterSave && onSaveAndConnect) return onSaveAndConnect(session);
      await onSave(session);
      return;
    }
    if (protocol === 'ssh') {
      const session = { ...base, username, credentialRef, protocol, terminalProfile: 'default' } as Session;
      if (connectAfterSave && onSaveAndConnect) return onSaveAndConnect(session);
      await onSave(session);
      return;
    }
    const session = { ...base, username, credentialRef, protocol, showHiddenFiles: false, remotePath: '/' } as Session;
    if (connectAfterSave && onSaveAndConnect) return onSaveAndConnect(session);
    await onSave(session);
  };

  const previewIcon = resolveSessionIcon(base as Session);

  return (
    <div className="card">
      <div className="row between">
        <h3>{title ?? (existing ? 'Edit session' : 'New session')}</h3>
        {onCancel && <button onClick={onCancel}>Close</button>}
      </div>

      <div className="session-form-grid">
        <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">No template</option>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Session name" />
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host" />
        <select value={protocol} onChange={(e) => onProtocolChange(e.target.value as Protocol)}>
          <option value="rdp">RDP</option>
          <option value="ssh">SSH</option>
          <option value="sftp">SFTP</option>
        </select>
        <div className="port-row">
          <input value={port} onChange={(e) => handlePortChange(e.target.value)} placeholder="Port" type="number" />
          <span className="port-state">{portMode === 'auto' ? 'Auto' : 'Custom'}</span>
          <button type="button" onClick={() => { setPortMode('auto'); setPort(defaultPortByProtocol[protocol]); }} title="Reset to protocol default">↺</button>
        </div>
        <select value={credentialSelection} onChange={(e) => {
          const value = e.target.value;
          if (value === 'manage') return onManageCredentials();
          if (value === 'new') return onManageCredentials();
          setCredentialSelection(value);
        }}>
          <option value="one-time">Use one-time credential</option>
          {sortedCredentials.map((credential) => (
            <option key={credential.id} value={credential.id}>
              {credential.favorite ? '★ ' : ''}{credential.name} · {credential.username} [{credential.type}] {credential.lastUsed ? '• recent' : ''}
            </option>
          ))}
          <option value="new">Add credential…</option>
          <option value="manage">Manage credentials…</option>
        </select>
        <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder / Group" />
      </div>

      {warning && <p className="warning-text">{warning}</p>}

      {credentialSelection === 'one-time' && (
        <div className="session-form-grid advanced-grid">
          <input value={oneTimeUsername} onChange={(e) => setOneTimeUsername(e.target.value)} placeholder="Username" />
          <input value={oneTimePassword} onChange={(e) => setOneTimePassword(e.target.value)} type="password" placeholder="Password" />
          <label className="checkbox-row">
            <input type="checkbox" checked={rememberCredential} onChange={(e) => setRememberCredential(e.target.checked)} />
            Remember credential for this session
          </label>
        </div>
      )}

      <div className="row form-meta">
        <div className="muted">Icon preview: {previewIcon.startsWith('data:') ? <img className="inline-icon" src={previewIcon} alt="session icon" /> : previewIcon} · {getSessionMetaLabel(base as Session)}</div>
        <button type="button" onClick={() => setShowAdvanced((value) => !value)}>{showAdvanced ? 'Hide advanced' : 'Show advanced'}</button>
      </div>

      {showAdvanced && (
        <div className="session-form-grid advanced-grid">
          <select value={osMode} onChange={(e) => setOsMode(e.target.value as 'auto' | 'manual')}>
            <option value="auto">Auto OS detection ({detectedOs})</option>
            <option value="manual">Manual OS override</option>
          </select>
          <select value={manualOsType} onChange={(e) => setManualOsType(e.target.value as SessionOsType)} disabled={osMode !== 'manual'}>
            <option value="windows">Windows</option><option value="linux">Linux</option><option value="network">Network device</option><option value="hypervisor">Hypervisor</option><option value="server">Generic server</option><option value="unknown">Unknown</option>
          </select>
          <select value={iconMode} onChange={(e) => setIconMode(e.target.value as 'auto' | 'custom')}><option value="auto">Auto icon</option><option value="custom">Custom icon</option></select>
          <input value={customIcon} onChange={(e) => setCustomIcon(e.target.value)} placeholder="Custom icon (emoji)" disabled={iconMode !== 'custom'} />
          <input type="file" accept="image/png,image/svg+xml" disabled={iconMode !== 'custom'} onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === 'string' && setUploadedIconDataUrl(reader.result);
            reader.readAsDataURL(file);
          }} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Description / notes" />
          {protocol === 'rdp' ? (
            <>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Domain (optional)" />
              <select value={resolutionMode} onChange={(e) => setResolutionMode(e.target.value as 'system' | 'fixed' | 'fullscreen')}>
                <option value="system">Fit to window (system)</option><option value="fixed">100% (fixed)</option><option value="fullscreen">Fullscreen</option>
              </select>
            </>
          ) : null}
        </div>
      )}

      <div className="row end">
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
        <button type="button" onClick={() => persist(false)}>Save</button>
        <button type="button" className="primary" onClick={() => persist(true)}>Save & Connect</button>
      </div>
    </div>
  );
}
