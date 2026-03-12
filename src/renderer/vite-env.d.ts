/// <reference types="vite/client" />

import type { CredentialProfile, Session, RdpEmbeddedCapability, RdpLaunchResult, SessionImportExport, SftpEntry, VaultFile } from '../shared/types';

declare global {
  interface Window {
    api: {
      loadVault(masterPassword: string): Promise<VaultFile>;
      saveVault(vault: VaultFile): Promise<void>;
      decryptSecret(id: string, password: string): Promise<string | undefined>;
      encryptSecret(id: string, secret: string, password: string): Promise<void>;
      exportSessions(path: string): Promise<void>;
      exportFullVault(path: string): Promise<void>;
      exportSelectedSessions(path: string, sessionIds: string[]): Promise<void>;
      importSessions(path: string): Promise<SessionImportExport>;
      importMergeVault(path: string): Promise<VaultFile>;
      importReplaceVault(path: string): Promise<VaultFile>;
      listCredentials(): Promise<CredentialProfile[]>;
      createCredential(payload: Omit<CredentialProfile, 'secretRef'>, password: string): Promise<CredentialProfile[]>;
      updateCredential(payload: CredentialProfile, password?: string): Promise<CredentialProfile[]>;
      deleteCredential(credentialId: string): Promise<CredentialProfile[]>;
      resolveCredential(credentialId: string): Promise<{ id: string; username: string; password: string; domain?: string; type: string } | undefined>;
      getRdpEmbeddedCapability(): Promise<RdpEmbeddedCapability>;
      launchRdp(session: Session): Promise<RdpLaunchResult>;
      detachSession(session: Session): Promise<boolean>;
      reattachSession(sessionId: string): Promise<boolean>;
      listDetachedSessions(): Promise<string[]>;
      sshConnect(sessionId: string, payload: Record<string, unknown>): Promise<boolean>;
      sshOpenShell(sessionId: string): Promise<boolean>;
      sshWrite(sessionId: string, input: string): Promise<boolean>;
      sshDisconnect(sessionId: string): Promise<boolean>;
      onSshData(sessionId: string, callback: (data: string) => void): () => void;
      sftpConnect(sessionId: string, payload: Record<string, unknown>): Promise<boolean>;
      sftpList(sessionId: string, remotePath: string): Promise<SftpEntry[]>;
      sftpUpload(sessionId: string, localPath: string, remotePath: string): Promise<boolean>;
      sftpDownload(sessionId: string, remotePath: string, localPath: string): Promise<boolean>;
      sftpRename(sessionId: string, fromPath: string, toPath: string): Promise<boolean>;
      sftpDelete(sessionId: string, targetPath: string, isDirectory: boolean): Promise<boolean>;
      sftpMkdir(sessionId: string, targetPath: string): Promise<boolean>;
      localfsList(localPath: string): Promise<SftpEntry[]>;
      localfsMkdir(targetPath: string): Promise<boolean>;
      localfsRename(fromPath: string, toPath: string): Promise<boolean>;
      localfsDelete(targetPath: string, isDirectory: boolean): Promise<boolean>;
    };
  }
}

export {};
