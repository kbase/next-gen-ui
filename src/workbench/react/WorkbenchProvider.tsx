import type { ReactNode } from 'react';
import { ServicesContext } from './context';
import type { WorkbenchServices } from './services';

export function WorkbenchProvider({
  services,
  children,
}: {
  services: WorkbenchServices;
  children: ReactNode;
}) {
  return <ServicesContext value={services}>{children}</ServicesContext>;
}
