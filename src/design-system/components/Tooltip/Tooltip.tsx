import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import styles from './Tooltip.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

export function Provider(props: BaseTooltip.Provider.Props) {
  return <BaseTooltip.Provider {...props} />;
}

export function Root(props: BaseTooltip.Root.Props) {
  return <BaseTooltip.Root {...props} />;
}

export function Trigger({
  render = <Button variant="ghost" />,
  ...props
}: BaseTooltip.Trigger.Props) {
  return <BaseTooltip.Trigger render={render} {...props} />;
}

export interface PopupProps extends Omit<BaseTooltip.Popup.Props, 'className'> {
  className?: string;
  /** Where to anchor the tooltip relative to the trigger. */
  side?: BaseTooltip.Positioner.Props['side'];
  /** Alignment along the chosen side. */
  align?: BaseTooltip.Positioner.Props['align'];
  /** Distance between the tooltip and the trigger, in px. */
  sideOffset?: BaseTooltip.Positioner.Props['sideOffset'];
}

export function Popup({ className, side, align, sideOffset, ...props }: PopupProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} align={align} sideOffset={sideOffset}>
        <BaseTooltip.Popup className={cx(styles.popup, className)} {...props} />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
