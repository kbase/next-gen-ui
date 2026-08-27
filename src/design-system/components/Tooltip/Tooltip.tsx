import { createContext, forwardRef, useContext, useId } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import styles from './Tooltip.module.scss';
import { Button } from '../Button';
import { cx } from '../../util/cx';

/* Base UI's tooltip never calls `useRole`, so nothing upstream sets `role="tooltip"` or
   `aria-describedby`. The id is created here because Trigger and Popup are siblings. */
const DescriptionId = createContext<string | undefined>(undefined);

export function Provider(props: BaseTooltip.Provider.Props) {
  return <BaseTooltip.Provider {...props} />;
}

export function Root(props: BaseTooltip.Root.Props) {
  const id = useId();
  return (
    <DescriptionId.Provider value={id}>
      <BaseTooltip.Root {...props} />
    </DescriptionId.Provider>
  );
}

export const Trigger = forwardRef<HTMLButtonElement, BaseTooltip.Trigger.Props>(function Trigger(
  { render = <Button variant="ghost" />, ...props },
  ref,
) {
  // The popup is unmounted while closed, so this resolves only while it is open.
  const describedBy = useContext(DescriptionId);
  return (
    <BaseTooltip.Trigger ref={ref} aria-describedby={describedBy} render={render} {...props} />
  );
});

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
  const id = useContext(DescriptionId);
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        className={styles.positioner}
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <BaseTooltip.Popup
          id={id}
          role="tooltip"
          className={cx(styles.popup, className)}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
