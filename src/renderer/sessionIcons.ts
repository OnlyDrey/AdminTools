import type { Protocol, Session, SessionOsType } from '../shared/types';

const protocolIconMap: Record<string, string> = {
  rdp: '🖥️',
  ssh: '⌨️',
  sftp: '📁',
  vnc: '📺',
  http: '🌐'
};

const osIconMap: Record<SessionOsType, string> = {
  windows: '🪟',
  linux: '🐧',
  network: '🛡️',
  hypervisor: '🗄️',
  server: '🖧',
  unknown: '🖥️'
};

const osLabelMap: Record<SessionOsType, string> = {
  windows: 'Windows',
  linux: 'Linux',
  network: 'Network device',
  hypervisor: 'Hypervisor',
  server: 'Generic server',
  unknown: 'Unknown OS'
};

export function detectOsType(host: string, protocol: Protocol): SessionOsType {
  const normalizedHost = host.toLowerCase().trim();
  if (normalizedHost.startsWith('win-')) return 'windows';
  if (normalizedHost.startsWith('linux-')) return 'linux';
  if (normalizedHost.startsWith('fw-')) return 'network';
  if (normalizedHost.startsWith('pve-') || normalizedHost.startsWith('esx-')) return 'hypervisor';
  if (normalizedHost.startsWith('srv-')) return 'server';

  if (protocol === 'rdp') return 'windows';
  if (protocol === 'ssh' || protocol === 'sftp') return 'linux';
  return 'unknown';
}

export function resolveSessionIcon(session: Session): string {
  if (session.iconMode === 'custom' && session.customIcon) {
    return session.customIcon;
  }
  if (session.uploadedIconDataUrl) {
    return session.uploadedIconDataUrl;
  }
  const osType = session.osType ?? detectOsType(session.host, session.protocol);
  return osIconMap[osType] ?? protocolIconMap[session.protocol];
}

export function getSessionMetaLabel(session: Session): string {
  const osType = session.osType ?? detectOsType(session.host, session.protocol);
  return `${osLabelMap[osType]} • ${session.protocol.toUpperCase()} • port ${session.port}`;
}

export function getProtocolIcon(protocol: Protocol): string {
  return protocolIconMap[protocol] ?? '🔗';
}
