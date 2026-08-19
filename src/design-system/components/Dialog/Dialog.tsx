import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import styles from './Dialog.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

export function Root(props: BaseDialog.Root.Props) {
  return <BaseDialog.Root {...props} />;
}

export function Trigger({ render = <Button />, ...props }: BaseDialog.Trigger.Props) {
  return <BaseDialog.Trigger render={render} {...props} />;
}

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

export function Close({ render = <Button />, ...props }: BaseDialog.Close.Props) {
  return <BaseDialog.Close render={render} {...props} />;
}
