import { createContext, useContext } from 'react';
import type { PanelParams } from './panel';

// What a plugin may ask the workbench to do. Deliberately small: opening the
// plugin's own document and running a registered command.
export interface PluginHost {
  openDocument: (params: PanelParams) => void;
  runCommand: (name: string, values?: Record<string, string | number>) => Promise<void>;
}

export const HostContext = createContext<PluginHost | null>(null);

export function useHost(): PluginHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useHost() called outside a workbench panel');
  return host;
}
