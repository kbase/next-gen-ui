import type { ReactNode } from 'react';
import type { WorkbenchServices } from '../../host/services';
import { useUrlSync } from '../hooks/useUrlSync';
import { Workbench } from '../Workbench';
import { WorkbenchProvider } from '../WorkbenchProvider';

// Both /workbench and /p/… render this; the URL differs, the shell does not.
export function WorkbenchPage({
  services,
  children,
}: {
  services: WorkbenchServices;
  children?: ReactNode;
}) {
  return (
    <WorkbenchProvider services={services}>
      <UrlSync />
      <Workbench />
      {children}
    </WorkbenchProvider>
  );
}

function UrlSync() {
  useUrlSync();
  return null;
}
