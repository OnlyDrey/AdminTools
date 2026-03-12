import type { Session } from '../shared/types';

export type EngineProtocol = 'rdp' | 'ssh' | 'sftp' | 'vnc';
export type DisplayMode = 'fit' | 'actual' | 'stretch' | 'fullscreen';

export interface RemoteSessionEngine {
  readonly protocol: EngineProtocol;
  readonly supportsDynamicResize: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  resize(width: number, height: number): Promise<void>;
  sendKey(keys: string[]): Promise<void>;
  reconnect(): Promise<void>;
}

class BaseEngine implements RemoteSessionEngine {
  readonly protocol: EngineProtocol;
  readonly supportsDynamicResize: boolean;

  constructor(protocol: EngineProtocol, supportsDynamicResize: boolean) {
    this.protocol = protocol;
    this.supportsDynamicResize = supportsDynamicResize;
  }

  async connect() {
    return Promise.resolve();
  }

  async disconnect() {
    return Promise.resolve();
  }

  async resize(_width: number, _height: number) {
    return Promise.resolve();
  }

  async sendKey(_keys: string[]) {
    return Promise.resolve();
  }

  async reconnect() {
    await this.disconnect();
    await this.connect();
  }
}

class RdpEngine extends BaseEngine {
  private readonly session: Session;

  constructor(session: Session) {
    super('rdp', false);
    this.session = session;
  }

  override async connect() {
    if (this.session.protocol === 'rdp') {
      await window.api.launchRdp(this.session);
    }
  }

  override async reconnect() {
    await this.connect();
  }
}

class SshEngine extends BaseEngine {
  constructor() {
    super('ssh', true);
  }
}

class SftpEngine extends BaseEngine {
  constructor() {
    super('sftp', true);
  }
}

class VncEngine extends BaseEngine {
  constructor() {
    super('vnc', true);
  }
}

export function createRemoteSessionEngine(session: Session): RemoteSessionEngine {
  if (session.protocol === 'rdp') {
    return new RdpEngine(session);
  }
  if (session.protocol === 'ssh') {
    return new SshEngine();
  }
  if (session.protocol === 'sftp') {
    return new SftpEngine();
  }
  return new VncEngine();
}
