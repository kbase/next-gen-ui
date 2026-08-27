import { Toast as BaseToast } from '@base-ui/react/toast';
import styles from './Toast.module.scss';
import { X } from '@phosphor-icons/react';

export function Provider({ children }: { children: React.ReactNode }) {
  return <BaseToast.Provider>{children}</BaseToast.Provider>;
}

function ToastItem({ toast }: { toast: BaseToast.Root.Props['toast'] }) {
  return (
    <BaseToast.Root toast={toast} className={styles.root}>
      <BaseToast.Content className={styles.content}>
        {toast.title && <BaseToast.Title className={styles.title}>{toast.title}</BaseToast.Title>}
        {toast.description && (
          <BaseToast.Description className={styles.description}>
            {toast.description}
          </BaseToast.Description>
        )}
        {/* Renders nothing when the toast has no action. */}
        <BaseToast.Action className={styles.action} />
      </BaseToast.Content>
      {/* Base UI keeps this aria-hidden until the viewport is expanded or it takes focus, since
          the live region already announces the toast. The label is for when it does. */}
      <BaseToast.Close className={styles.close} aria-label="Close">
        <X size={12} aria-hidden />
      </BaseToast.Close>
    </BaseToast.Root>
  );
}

export function Viewport() {
  const { toasts } = BaseToast.useToastManager();
  return (
    <BaseToast.Viewport className={styles.viewport}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </BaseToast.Viewport>
  );
}
