import type { Session } from '../shared/types';
import type { RemoteCommand } from './components/RemoteSessionToolbar';

export interface CommandResolution {
  enabled: boolean;
  reason?: string;
}

export function resolveCommandCapability(session: Session, command: RemoteCommand): CommandResolution {
  const windowsOnly: RemoteCommand[] = [
    'send-ctrl-alt-del',
    'send-ctrl-esc',
    'send-alt-tab',
    'send-win',
    'lock-workstation',
    'open-task-manager'
  ];

  if ((session.protocol === 'ssh' || session.protocol === 'sftp') && windowsOnly.includes(command)) {
    return { enabled: false, reason: 'Windows desktop command is unavailable for this protocol.' };
  }

  if (session.protocol === 'sftp' && command === 'send-clipboard') {
    return { enabled: false, reason: 'Clipboard injection is not supported for SFTP view.' };
  }

  if (session.protocol === 'rdp' && windowsOnly.includes(command)) {
    return { enabled: false, reason: 'System RDP client mode cannot inject this key yet. Embedded RDP hook prepared.' };
  }

  return { enabled: true };
}

export async function routeRemoteCommand(
  session: Session,
  command: RemoteCommand,
  handlers: {
    reconnect: () => Promise<void>;
    disconnect: () => Promise<void>;
    detach: () => Promise<void>;
    feedback: (message: string) => void;
  }
) {
  const capability = resolveCommandCapability(session, command);
  if (!capability.enabled) {
    handlers.feedback(capability.reason ?? 'Command unsupported');
    return;
  }

  if (command === 'reconnect') return handlers.reconnect();
  if (command === 'disconnect') return handlers.disconnect();
  if (command === 'detach') return handlers.detach();

  handlers.feedback(`${command} sent`);
}
