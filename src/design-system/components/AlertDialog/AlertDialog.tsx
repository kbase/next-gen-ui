import { forwardRef } from 'react';
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import styles from '../Dialog/Dialog.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

/* Dialog's parts and stylesheet with role="alertdialog", for destructive or
   irreversible actions. The backdrop does not dismiss it; Escape does, so
   Escape must cancel, never confirm. Use Dialog when the user can leave
   without deciding. */

export function Root(props: BaseAlertDialog.Root.Props) {
  return <BaseAlertDialog.Root {...props} />;
}

export const Trigger = forwardRef<HTMLButtonElement, BaseAlertDialog.Trigger.Props>(
  function Trigger({ render = <Button />, ...props }, ref) {
    return <BaseAlertDialog.Trigger ref={ref} render={render} {...props} />;
  },
);

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

export const Close = forwardRef<HTMLButtonElement, BaseAlertDialog.Close.Props>(function Close(
  { render = <Button />, ...props },
  ref,
) {
  return <BaseAlertDialog.Close ref={ref} render={render} {...props} />;
});
