import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import styles from '../Dialog/Dialog.module.scss';
import { cx } from '../../util/cx';

/* Same parts and the same styles as Dialog, for a decision the user has to
   make: clicking the backdrop does not dismiss it, so the choice is made
   deliberately rather than by clicking past. Escape still closes it, so
   always give the non-committing option its own Close. Reach for Dialog
   instead whenever backing out with no choice made is unremarkable. */

export function Root(props: BaseAlertDialog.Root.Props) {
  return <BaseAlertDialog.Root {...props} />;
}

export function Trigger(props: BaseAlertDialog.Trigger.Props) {
  return <BaseAlertDialog.Trigger {...props} />;
}

export interface PopupProps extends Omit<BaseAlertDialog.Popup.Props, 'className'> {
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className={styles.backdrop} />
      <BaseAlertDialog.Popup className={cx(styles.popup, className)} {...props} />
    </BaseAlertDialog.Portal>
  );
}

export interface TitleProps extends Omit<BaseAlertDialog.Title.Props, 'className'> {
  className?: string;
}

export function Title({ className, ...props }: TitleProps) {
  return <BaseAlertDialog.Title className={cx(styles.title, className)} {...props} />;
}

export interface DescriptionProps extends Omit<BaseAlertDialog.Description.Props, 'className'> {
  className?: string;
}

export function Description({ className, ...props }: DescriptionProps) {
  return <BaseAlertDialog.Description className={cx(styles.description, className)} {...props} />;
}

export function Close(props: BaseAlertDialog.Close.Props) {
  return <BaseAlertDialog.Close {...props} />;
}
