import { useEffect, useMemo, useState } from 'react';
import type { Protocol, Session } from '../../shared/types';
import { getSessionMetaLabel, resolveSessionIcon } from '../sessionIcons';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export type RemoteCommand =
  | 'send-ctrl-alt-del'
  | 'send-ctrl-esc'
  | 'send-win'
  | 'send-alt-tab'
  | 'open-task-manager'
  | 'lock-workstation'
  | 'reconnect'
  | 'disconnect'
  | 'fullscreen-toggle'
  | 'fit-window'
  | 'scale-100'
  | 'send-clipboard'
  | 'sync-clipboard'
  | 'detach';

interface RemoteSessionToolbarProps {
  session: Session;
  status: ConnectionStatus;
  onCommand: (command: RemoteCommand) => void;
}

interface CommandDef {
  id: RemoteCommand;
  label: string;
  icon: string;
  shortcut?: string;
}

const quickCommands: CommandDef[] = [
  { id: 'send-ctrl-alt-del', label: 'Send Ctrl+Alt+Del', icon: '🧷', shortcut: 'Ctrl+Shift+End' },
  { id: 'send-ctrl-esc', label: 'Send Ctrl+Esc', icon: '⎋' },
  { id: 'send-win', label: 'Send Win key', icon: '⊞' },
  { id: 'send-alt-tab', label: 'Send Alt+Tab', icon: '⇥' },
  { id: 'open-task-manager', label: 'Open Task Manager', icon: '📋' },
  { id: 'lock-workstation', label: 'Lock workstation', icon: '🔒' },
  { id: 'send-clipboard', label: 'Send clipboard', icon: '📎' },
  { id: 'sync-clipboard', label: 'Sync clipboard toggle', icon: '🔁' }
];

const viewCommands: CommandDef[] = [
  { id: 'reconnect', label: 'Reconnect', icon: '🔄' },
  { id: 'disconnect', label: 'Disconnect', icon: '⛔' },
  { id: 'fullscreen-toggle', label: 'Fullscreen toggle', icon: '⛶' },
  { id: 'fit-window', label: 'Fit to window', icon: '🪟' },
  { id: 'scale-100', label: '100% scale', icon: '1:1' },
  { id: 'detach', label: 'Detach session', icon: '↗' }
];

function supportsCommand(protocol: Protocol, command: RemoteCommand) {
  if (protocol === 'rdp') {
    return true;
  }
  if (protocol === 'ssh') {
    return ['reconnect', 'disconnect', 'fullscreen-toggle', 'fit-window', 'scale-100', 'detach', 'send-clipboard', 'sync-clipboard'].includes(command);
  }
  if (protocol === 'sftp') {
    return ['reconnect', 'disconnect', 'fullscreen-toggle', 'fit-window', 'scale-100', 'detach', 'send-clipboard', 'sync-clipboard'].includes(command);
  }
  return false;
}

export function RemoteSessionToolbar({ session, status, onCommand }: RemoteSessionToolbarProps) {
  const [hovering, setHovering] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 300);
    return () => window.clearInterval(id);
  }, []);

  const isVisible = useMemo(() => hovering || now - lastInteraction < 2500, [hovering, lastInteraction, now]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'End') {
        event.preventDefault();
        onCommand('send-ctrl-alt-del');
        setLastInteraction(Date.now());
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        onCommand('fullscreen-toggle');
        setLastInteraction(Date.now());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCommand]);

  return (
    <div
      className={`remote-toolbar-shell ${isVisible ? 'visible' : 'hidden'}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={() => setLastInteraction(Date.now())}
    >
      <div className="remote-toolbar left">
        <span title={getSessionMetaLabel(session)}>{resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)}</span>
        <strong>{session.name}</strong>
        <span className="muted">{session.protocol.toUpperCase()}</span>
        <span className={`status-pill ${status}`}>{status}</span>
      </div>

      <div className="remote-toolbar center">
        {quickCommands.map((command) => {
          const supported = supportsCommand(session.protocol, command.id);
          return (
            <button
              key={command.id}
              disabled={!supported}
              title={`${command.label}${command.shortcut ? ` (${command.shortcut})` : ''}${supported ? '' : ' (unsupported for protocol)'}`}
              onClick={() => {
                onCommand(command.id);
                setLastInteraction(Date.now());
              }}
            >
              {command.icon}
            </button>
          );
        })}
      </div>

      <div className="remote-toolbar right">
        {viewCommands.map((command) => {
          const supported = supportsCommand(session.protocol, command.id);
          return (
            <button
              key={command.id}
              disabled={!supported}
              title={`${command.label}${supported ? '' : ' (unsupported for protocol)'}`}
              onClick={() => {
                onCommand(command.id);
                setLastInteraction(Date.now());
              }}
            >
              {command.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
