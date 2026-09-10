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
  /**
   * Positions against this element instead of the Trigger — for a
   * controlled popover whose opener is some other control (a menu item).
   */
  anchor?: BasePopover.Positioner.Props['anchor'];
  side?: BasePopover.Positioner.Props['side'];
  sideOffset?: BasePopover.Positioner.Props['sideOffset'];
  /** A tall popup on a small anchor wants `start`, not the centered default. */
  align?: BasePopover.Positioner.Props['align'];
  alignOffset?: BasePopover.Positioner.Props['alignOffset'];
}

export function Popup({
  className,
  anchor,
  side,
  sideOffset,
  align,
  alignOffset,
  ...props
}: PopupProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        className={styles.positioner}
        anchor={anchor}
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
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
