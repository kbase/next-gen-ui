import { Toast as BaseToast } from '@base-ui/react/toast';

// Separated from Toast.tsx so the file containing components doesn't
// also export these non-component functions (react-refresh HMR rule).
export const useToastManager = BaseToast.useToastManager;

// A manager built outside React, for code that raises toasts from
// nowhere in the tree — a host handle, a command runner. Pass it to
// `Toast.Provider` as `manager`.
export const createToastManager = BaseToast.createToastManager;
export type ToastManager = ReturnType<typeof createToastManager>;
