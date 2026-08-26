import { Select as BaseSelect } from '@base-ui/react/select';
import styles from './Select.module.scss';
import { cx } from '../../util/cx';
import { CaretDown, Check } from '@phosphor-icons/react';

// @base-ui/react ≥1.4's `Props` is generic over the value type; propagate
// the generic so consumers keep type inference.
export function Root<Value, Multiple extends boolean | undefined = false>(
  props: BaseSelect.Root.Props<Value, Multiple>,
) {
  return <BaseSelect.Root {...props} />;
}

export interface TriggerProps extends Omit<BaseSelect.Trigger.Props, 'className'> {
  className?: string;
}

// `children` is intentionally not surfaced. Trigger renders the Base UI
// `<Value />` and a caret icon, regardless of what's passed in.
export function Trigger({ className, ...props }: TriggerProps) {
  return (
    <BaseSelect.Trigger className={cx(styles.trigger, className)} {...props}>
      <BaseSelect.Value />
      <BaseSelect.Icon className={styles.icon}>
        <CaretDown size={12} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function Popup(props: Omit<BaseSelect.Popup.Props, 'className'> & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner className={styles.positioner}>
        <BaseSelect.Popup className={cx(styles.popup, className)} {...rest} />
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
