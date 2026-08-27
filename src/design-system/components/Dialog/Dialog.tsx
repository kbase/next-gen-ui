import { forwardRef } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import styles from './Dialog.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

export function Root(props: BaseDialog.Root.Props) {
  return <BaseDialog.Root {...props} />;
}

export const Trigger = forwardRef<HTMLButtonElement, BaseDialog.Trigger.Props>(function Trigger(
  { render = <Button />, ...props },
  ref,
) {
  return <BaseDialog.Trigger ref={ref} render={render} {...props} />;
});

export interface PopupProps extends Omit<BaseDialog.Popup.Props, 'className'> {
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={styles.backdrop} />
      <BaseDialog.Popup className={cx(styles.popup, className)} {...props} />
    </BaseDialog.Portal>
  );
}

export interface TitleProps extends Omit<BaseDialog.Title.Props, 'className'> {
  className?: string;
}

export function Title({ className, ...props }: TitleProps) {
  return <BaseDialog.Title className={cx(styles.title, className)} {...props} />;
}

export interface DescriptionProps extends Omit<BaseDialog.Description.Props, 'className'> {
  className?: string;
}

export function Description({ className, ...props }: DescriptionProps) {
  return <BaseDialog.Description className={cx(styles.description, className)} {...props} />;
}

export const Close = forwardRef<HTMLButtonElement, BaseDialog.Close.Props>(function Close(
  { render = <Button />, ...props },
  ref,
) {
  return <BaseDialog.Close ref={ref} render={render} {...props} />;
});
