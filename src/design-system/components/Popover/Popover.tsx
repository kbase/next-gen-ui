import { forwardRef } from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import styles from './Popover.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

export function Root(props: BasePopover.Root.Props) {
  return <BasePopover.Root {...props} />;
}

export const Trigger = forwardRef<HTMLButtonElement, BasePopover.Trigger.Props>(function Trigger(
  { render = <Button />, ...props },
  ref,
) {
  return <BasePopover.Trigger ref={ref} render={render} {...props} />;
});

export interface PopupProps extends Omit<BasePopover.Popup.Props, 'className'> {
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner className={styles.positioner}>
        <BasePopover.Popup className={cx(styles.popup, className)} {...props} />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export function Title(props: BasePopover.Title.Props) {
  return <BasePopover.Title className={styles.title} {...props} />;
}

export function Description(props: BasePopover.Description.Props) {
  return <BasePopover.Description className={styles.description} {...props} />;
}

export const Close = forwardRef<HTMLButtonElement, BasePopover.Close.Props>(function Close(
  { render = <Button />, ...props },
  ref,
) {
  return <BasePopover.Close ref={ref} render={render} {...props} />;
});
