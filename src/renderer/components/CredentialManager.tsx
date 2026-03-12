import { useMemo, useState } from 'react';
import type { CredentialProfile, CredentialType } from '../../shared/types';

interface CredentialManagerProps {
  credentials: CredentialProfile[];
  onCreate: (payload: Omit<CredentialProfile, 'secretRef'>, password: string) => Promise<void>;
  onUpdate: (payload: CredentialProfile, password?: string) => Promise<void>;
  onDelete: (credentialId: string) => Promise<void>;
}

const typeIcon: Record<CredentialType, string> = {
  windows: '🪟',
  linux: '🐧',
  generic: '🔐'
};

export function CredentialManager({ credentials, onCreate, onUpdate, onDelete }: CredentialManagerProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CredentialProfile | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<CredentialType>('generic');
  const [tags, setTags] = useState('');
  const [password, setPassword] = useState('');

  const filtered = useMemo(() => credentials.filter((item) => {
    const query = `${item.name} ${item.username} ${item.type} ${(item.tags ?? []).join(' ')}`.toLowerCase();
    return query.includes(search.toLowerCase());
  }), [credentials, search]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setUsername('');
    setDomain('');
    setType('generic');
    setTags('');
    setPassword('');
  };

  const submit = async () => {
    if (!name.trim() || !username.trim()) return;
    if (editing) {
      await onUpdate({
        ...editing,
        name: name.trim(),
        username: username.trim(),
        domain: domain.trim() || undefined,
        type,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean)
      }, password || undefined);
      resetForm();
      return;
    }
    if (!password) return;
    await onCreate({
      id: crypto.randomUUID(),
      name: name.trim(),
      username: username.trim(),
      domain: domain.trim() || undefined,
      type,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      favorite: false,
      lastUsed: undefined
    }, password);
    resetForm();
  };

  return (
    <section className="card">
      <div className="row between">
        <h3>Credentials</h3>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search credentials" />
      </div>

      <div className="session-list">
        {filtered.map((credential) => (
          <div className="session-row" key={credential.id}>
            <div>
              <strong>{typeIcon[credential.type]} {credential.name}</strong>
              <p className="muted">{credential.username}{credential.domain ? `@${credential.domain}` : ''}</p>
              <p className="muted">Last used: {credential.lastUsed ? new Date(credential.lastUsed).toLocaleString() : 'Never'}</p>
            </div>
            <div className="row">
              <button onClick={() => onUpdate({ ...credential, favorite: !credential.favorite })}>{credential.favorite ? '★' : '☆'}</button>
              <button onClick={() => {
                setEditing(credential);
                setName(credential.name);
                setUsername(credential.username);
                setDomain(credential.domain ?? '');
                setType(credential.type);
                setTags((credential.tags ?? []).join(', '));
                setPassword('');
              }}>Edit</button>
              <button onClick={() => onDelete(credential.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="session-form-grid advanced-grid">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Domain (optional)" />
        <select value={type} onChange={(e) => setType(e.target.value as CredentialType)}>
          <option value="windows">Windows</option>
          <option value="linux">Linux</option>
          <option value="generic">Generic</option>
        </select>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editing ? 'New password (optional)' : 'Password'} type="password" />
      </div>
      <div className="row end">
        {editing && <button onClick={resetForm}>Cancel edit</button>}
        <button onClick={submit}>{editing ? 'Update credential' : 'Add credential'}</button>
      </div>
    </section>
  );
}
