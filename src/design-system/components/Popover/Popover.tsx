import { Popover as BasePopover } from '@base-ui/react/popover';
import styles from './Popover.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

export function Root(props: BasePopover.Root.Props) {
  return <BasePopover.Root {...props} />;
}

export function Trigger({ render = <Button />, ...props }: BasePopover.Trigger.Props) {
  return <BasePopover.Trigger render={render} {...props} />;
}

export interface PopupProps extends Omit<BasePopover.Popup.Props, 'className'> {
  className?: string;
}

export function Popup({ className, ...props }: PopupProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner>
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

export function Close({ render = <Button />, ...props }: BasePopover.Close.Props) {
  return <BasePopover.Close render={render} {...props} />;
}
