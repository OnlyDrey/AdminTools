import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';

export interface RdpEmbeddedCapability {
  available: boolean;
  mode: 'embedded' | 'external';
  reason: string;
  helperPath?: string;
}

export function detectRdpEmbeddedCapability(): RdpEmbeddedCapability {
  if (os.platform() !== 'win32') {
    return { available: false, mode: 'external', reason: 'Embedded RDP helper is currently Windows-only.' };
  }

  const helperPath = path.join(app.getPath('userData'), 'rdp-helper', 'admintools-rdp-helper.exe');
  if (fs.existsSync(helperPath)) {
    return {
      available: true,
      mode: 'embedded',
      reason: 'Experimental embedded helper detected. Use feature flag to enable renderer surface.',
      helperPath
    };
  }

  return {
    available: false,
    mode: 'external',
    reason: 'No embedded RDP helper installed. Falling back to external mstsc mode.',
    helperPath
  };
}
