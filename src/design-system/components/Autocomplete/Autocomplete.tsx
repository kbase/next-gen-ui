import { useCallback } from 'react';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import styles from './Autocomplete.module.scss';
import { cx } from '../../util/cx';

export interface AutocompleteProps extends Omit<
  BaseAutocomplete.Input.Props,
  'className' | 'value' | 'defaultValue' | 'onChange'
> {
  /** The suggestions. A value outside this list is still allowed. */
  items: readonly string[];
  /** Use when controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shown when nothing matches. Say what happens to the typed value. */
  emptyMessage?: string;
  className?: string;
}

export function Autocomplete({
  items,
  value,
  defaultValue,
  onValueChange,
  emptyMessage = 'No matches',
  className,
  ...props
}: AutocompleteProps) {
  const { contains } = BaseAutocomplete.useFilter();

  // With a whole item in the field, the default filter matches only that
  // item, so the list would show one option: the one already chosen.
  const filter = useCallback(
    (item: string, query: string) => items.includes(query) || contains(item, query),
    [items, contains],
  );

  return (
    <BaseAutocomplete.Root
      items={items}
      filter={filter}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      // Show the suggestions on click, not only after typing.
      openOnInputClick
    >
      <BaseAutocomplete.Input className={cx(styles.input, className)} {...props} />
      <BaseAutocomplete.Portal>
        <BaseAutocomplete.Positioner sideOffset={4} className={styles.positioner}>
          <BaseAutocomplete.Popup className={styles.popup}>
            {/* Base UI announces this; it must stay mounted rather than be
                rendered conditionally. */}
            <BaseAutocomplete.Empty className={styles.empty}>{emptyMessage}</BaseAutocomplete.Empty>
            <BaseAutocomplete.List>
              {(item: string) => (
                <BaseAutocomplete.Item key={item} value={item} className={styles.item}>
                  {item}
                </BaseAutocomplete.Item>
              )}
            </BaseAutocomplete.List>
          </BaseAutocomplete.Popup>
        </BaseAutocomplete.Positioner>
      </BaseAutocomplete.Portal>
    </BaseAutocomplete.Root>
  );
}
