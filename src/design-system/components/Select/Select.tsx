import { Select as BaseSelect } from '@base-ui/react/select';
import styles from './Select.module.scss';
import { cx } from '../../util/cx';
import type { Size } from '../../util/size';
import { CaretDown, Check } from '@phosphor-icons/react';

// @base-ui/react ≥1.4's `Props` is generic over the value type; propagate
// the generic so consumers keep type inference.
export function Root<Value, Multiple extends boolean | undefined = false>(
  props: BaseSelect.Root.Props<Value, Multiple>,
) {
  return <BaseSelect.Root {...props} />;
}

export interface TriggerProps extends Omit<BaseSelect.Trigger.Props, 'className'> {
  /** Density tier; unset, the enclosing `data-density` applies. */
  size?: Size;
  className?: string;
}

// `children` is intentionally not surfaced. Trigger renders the Base UI
// `<Value />` and a caret icon, regardless of what's passed in.
export function Trigger({ size, className, ...props }: TriggerProps) {
  return (
    <BaseSelect.Trigger className={cx(styles.trigger, className)} data-size={size} {...props}>
      <BaseSelect.Value />
      <BaseSelect.Icon className={styles.icon}>
        <CaretDown size={12} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export interface PopupProps extends Omit<BaseSelect.Popup.Props, 'className'> {
  /**
   * Density tier. The popup is portaled to <body>, so a `data-density` on the page region
   * around the trigger does not reach it; pass the trigger's size here too.
   */
  size?: Size;
  className?: string;
}

export function Popup({ size, className, ...rest }: PopupProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner className={styles.positioner}>
        <BaseSelect.Popup className={cx(styles.popup, className)} data-size={size} {...rest} />
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export interface ItemProps extends Omit<BaseSelect.Item.Props, 'className'> {
  className?: string;
}

export function Item({ className, children, ...props }: ItemProps) {
  return (
    <BaseSelect.Item className={cx(styles.item, className)} {...props}>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className={styles.itemIndicator}>
        <Check size={12} weight="bold" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}
