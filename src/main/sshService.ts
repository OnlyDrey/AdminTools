import { Client } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';
import type { SftpEntry } from '../shared/types.js';

const sshConnections = new Map<string, Client>();
const sftpConnections = new Map<string, SftpClient>();

export async function connectSsh(id: string, config: {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const client = new Client();
    client
      .on('ready', () => {
        sshConnections.set(id, client);
        resolve();
      })
      .on('error', reject)
      .connect(config);
  });
}

export async function openShell(id: string, onData: (data: string) => void) {
  const client = sshConnections.get(id);
  if (!client) {
    throw new Error('SSH session not connected');
  }
  client.shell((err, stream) => {
    if (err) throw err;
    stream.on('data', (data: Buffer) => onData(data.toString()));
  });
}

export async function connectSftp(id: string, config: {
  host: string;
  port: number;
  username: string;
  password?: string;
}) {
  const sftp = new SftpClient();
  await sftp.connect(config);
  sftpConnections.set(id, sftp);
}

export async function listSftp(id: string, remotePath: string): Promise<SftpEntry[]> {
  const sftp = sftpConnections.get(id);
  if (!sftp) {
    throw new Error('SFTP session not connected');
  }
  const list = await sftp.list(remotePath);
  return list.map((entry) => ({
    name: entry.name,
    type: entry.type,
    size: entry.size,
    modifyTime: entry.modifyTime
  }));
}

export async function closeSftp(id: string) {
  const sftp = sftpConnections.get(id);
  if (sftp) {
    await sftp.end();
    sftpConnections.delete(id);
  }
}
