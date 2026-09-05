import { useSyncExternalStore } from 'react';
import { useServices } from './context';
import styles from './Workbench.module.css';

// The one live region in the workbench. Everything that wants a screen
// reader to say something goes through the announcer.
export function LiveRegion() {
  const { announcer } = useServices();
  const { text, nonce } = useSyncExternalStore(announcer.subscribe, announcer.get, announcer.get);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Workbench announcements"
      className={styles.srOnly}
    >
      <span key={nonce}>{text}</span>
    </div>
  );
}
