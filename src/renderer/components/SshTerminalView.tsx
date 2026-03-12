import { useEffect, useMemo, useRef, useState } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type { Session } from '../../shared/types';

interface SshTerminalViewProps {
  session: Session;
}

export function SshTerminalView({ session }: SshTerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const transcriptRef = useRef<string[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [fontSize, setFontSize] = useState(13);
  const [wrap, setWrap] = useState(true);
  const [visualBell, setVisualBell] = useState(true);

  const hostInfo = useMemo(() => `${session.host}:${session.port} (${session.username})`, [session.host, session.port, session.username]);

  const initializeTerminal = () => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize,
      convertEol: true,
      scrollback: 4000,
      allowProposedApi: true,
      theme: { background: '#020617', foreground: '#e2e8f0' }
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    if (containerRef.current) {
      terminal.open(containerRef.current);
      fit.fit();
      terminal.focus();
    }
    terminalRef.current = terminal;
    fitRef.current = fit;

    terminal.onBell(() => {
      if (!visualBell || !containerRef.current) return;
      containerRef.current.classList.add('bell-flash');
      window.setTimeout(() => containerRef.current?.classList.remove('bell-flash'), 160);
    });

    terminal.onData((data) => {
      window.api.sshWrite(session.id, data).catch(() => undefined);
    });

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        const selected = terminal.getSelection();
        if (selected) {
          navigator.clipboard.writeText(selected).catch(() => undefined);
          return false;
        }
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then((text) => window.api.sshWrite(session.id, text)).catch(() => undefined);
        return false;
      }
      return true;
    });
  };

  const connect = async () => {
    if (session.protocol !== 'ssh') return;
    setStatus('connecting');
    try {
      const resolved = session.credentialRef ? await window.api.resolveCredential(session.credentialRef) : undefined;
      await window.api.sshConnect(session.id, {
        host: session.host,
        port: session.port,
        username: resolved?.username ?? session.username,
        password: resolved?.password
      });
      await window.api.sshOpenShell(session.id);
      setStatus('connected');
    } catch {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    initializeTerminal();
    const unsub = window.api.onSshData(session.id, (data) => {
      transcriptRef.current.push(data);
      terminalRef.current?.write(data);
    });

    connect().catch(() => undefined);

    const onResize = () => fitRef.current?.fit();
    window.addEventListener('resize', onResize);

    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
      window.api.sshDisconnect(session.id).catch(() => undefined);
      terminalRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.fontSize = fontSize;
      fitRef.current?.fit();
    }
  }, [fontSize]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.disableStdin = status !== 'connected';
      terminalRef.current.options.wordSeparator = wrap ? ' ()[]{}' : '';
    }
  }, [status, wrap]);

  return (
    <div className="ssh-terminal-view">
      <div className="row between ssh-terminal-meta">
        <div>
          <strong>SSH Terminal</strong>
          <p className="muted">{hostInfo} · {status}</p>
        </div>
        <div className="row ssh-terminal-actions">
          <button onClick={() => navigator.clipboard.writeText(terminalRef.current?.getSelection() ?? '')}>Copy</button>
          <button onClick={() => navigator.clipboard.readText().then((text) => window.api.sshWrite(session.id, text)).catch(() => undefined)}>Paste</button>
          <button onClick={() => terminalRef.current?.clear()}>Clear</button>
          <button onClick={() => setFontSize((v) => v + 1)}>A+</button>
          <button onClick={() => setFontSize((v) => Math.max(10, v - 1))}>A-</button>
          <button onClick={() => setFontSize(13)}>A0</button>
          <button onClick={() => setWrap((v) => !v)}>{wrap ? 'Wrap on' : 'Wrap off'}</button>
          <button onClick={() => setVisualBell((v) => !v)}>{visualBell ? 'Bell on' : 'Bell off'}</button>
          <button onClick={() => {
            const blob = new Blob([transcriptRef.current.join('')], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${session.name.replace(/\s+/g, '_')}-transcript.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
          }}>Transcript</button>
          {status !== 'connected' && <button onClick={() => connect().catch(() => undefined)}>Reconnect</button>}
        </div>
      </div>
      <div ref={containerRef} className="terminal terminal-interactive" data-terminal-input="true" />
    </div>
  );
}
