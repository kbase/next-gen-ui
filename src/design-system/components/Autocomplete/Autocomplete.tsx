import { useCallback, useMemo, useState } from 'react';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import styles from './Autocomplete.module.scss';
import { cx } from '../../util/cx';

/**
 * Plain strings: Base UI's published union omits `input-press`, which its
 * runtime emits for `openOnInputClick`.
 */
const BROWSE_REASONS: readonly string[] = ['input-press', 'list-navigation'];

export interface AutocompleteProps extends Omit<
  BaseAutocomplete.Input.Props,
  'className' | 'value' | 'defaultValue' | 'onChange'
> {
  /** The suggestions. A value outside this list is also valid. */
  items: readonly string[];
  value?: string;
  defaultValue?: string;
  /** Base UI's second argument is the reason the value changed. */
  onValueChange?: BaseAutocomplete.Root.Props<string>['onValueChange'];
  /** Shown when nothing matches. State what happens to the typed value. */
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

  // The list keys on the string, and Base UI does not dedupe.
  const options = useMemo(() => [...new Set(items)], [items]);

  // Set from why the popup opened, not from the value: comparing the value to
  // the items cannot tell browsing from having just typed a match.
  const [browsing, setBrowsing] = useState(false);

  const filter = useCallback(
    (item: string, query: string) => browsing || contains(item, query),
    [browsing, contains],
  );

  return (
    <BaseAutocomplete.Root
      items={options}
      filter={filter}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next, details) => {
        setBrowsing(false);
        onValueChange?.(next, details);
      }}
      onOpenChange={(open, details) => {
        if (!open) setBrowsing(false);
        else if (BROWSE_REASONS.includes(details.reason)) setBrowsing(true);
      }}
      openOnInputClick
    >
      <BaseAutocomplete.Input className={cx(styles.input, className)} {...props} />
      <BaseAutocomplete.Portal>
        <BaseAutocomplete.Positioner sideOffset={4} className={styles.positioner}>
          <BaseAutocomplete.Popup className={styles.popup}>
            {/* Base UI announces this, so it must stay mounted rather than be
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
