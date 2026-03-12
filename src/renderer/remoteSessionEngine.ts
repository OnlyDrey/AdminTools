import type { Session } from '../shared/types';

export type EngineProtocol = 'rdp' | 'ssh' | 'sftp' | 'vnc';
export type DisplayMode = 'fit' | 'actual' | 'stretch' | 'fullscreen';

export interface RemoteSessionEngine {
  readonly protocol: EngineProtocol;
  readonly supportsDynamicResize: boolean;
  readonly supportsEmbeddedSurface: boolean;
  readonly supportsKeyInjection: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  resize(width: number, height: number): Promise<void>;
  sendKey(keys: string[]): Promise<void>;
  reconnect(): Promise<void>;
}

class BaseEngine implements RemoteSessionEngine {
  readonly protocol: EngineProtocol;
  readonly supportsDynamicResize: boolean;
  readonly supportsEmbeddedSurface: boolean;
  readonly supportsKeyInjection: boolean;

  constructor(protocol: EngineProtocol, capabilities?: Partial<Pick<RemoteSessionEngine, 'supportsDynamicResize' | 'supportsEmbeddedSurface' | 'supportsKeyInjection'>>) {
    this.protocol = protocol;
    this.supportsDynamicResize = capabilities?.supportsDynamicResize ?? false;
    this.supportsEmbeddedSurface = capabilities?.supportsEmbeddedSurface ?? false;
    this.supportsKeyInjection = capabilities?.supportsKeyInjection ?? false;
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
    super('rdp', {
      supportsDynamicResize: false,
      supportsEmbeddedSurface: false,
      supportsKeyInjection: false
    });
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
    super('ssh', {
      supportsDynamicResize: true,
      supportsEmbeddedSurface: true,
      supportsKeyInjection: true
    });
  }
}

class SftpEngine extends BaseEngine {
  constructor() {
    super('sftp', {
      supportsDynamicResize: true,
      supportsEmbeddedSurface: true,
      supportsKeyInjection: false
    });
  }
}

class VncEngine extends BaseEngine {
  constructor() {
    super('vnc', {
      supportsDynamicResize: true,
      supportsEmbeddedSurface: false,
      supportsKeyInjection: false
    });
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
