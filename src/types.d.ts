declare module 'ssh2-sftp-client' {
  interface ConnectOptions {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string | Buffer;
    passphrase?: string;
  }

  interface FileInfo {
    name: string;
    type: string;
    size: number;
    modifyTime: number;
    accessTime: number;
    rights?: { user: string; group: string; other: string };
    owner?: number;
    group?: number;
  }

  export default class SftpClient {
    connect(options: ConnectOptions): Promise<void>;
    list(remotePath: string): Promise<FileInfo[]>;
    end(): Promise<void>;
  }
}
