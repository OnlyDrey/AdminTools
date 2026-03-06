import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface SshTerminalProps {
  title: string;
}

export function SshTerminal({ title }: SshTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      theme: { background: '#020617', foreground: '#e2e8f0' }
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    if (containerRef.current) {
      terminal.open(containerRef.current);
      fit.fit();
    }
    terminal.writeln(`AdminTools embedded SSH terminal - ${title}`);
    terminal.writeln('Use Connect from session actions to open a live SSH shell.');

    const onResize = () => fit.fit();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      terminal.dispose();
    };
  }, [title]);

  return <div ref={containerRef} className="terminal" />;
}
