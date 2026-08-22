import { useCallback, useMemo, useState } from 'react';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import styles from './Autocomplete.module.scss';
import { cx } from '../../util/cx';

/**
 * Opens that mean "show me what there is" rather than "I am typing". Typed as
 * strings because Base UI's published union omits `input-press`, which the
 * runtime emits when `openOnInputClick` fires.
 */
const BROWSE_REASONS: readonly string[] = ['input-press', 'trigger-press'];

export interface AutocompleteProps extends Omit<
  BaseAutocomplete.Input.Props,
  'className' | 'value' | 'defaultValue' | 'onChange'
> {
  /** The suggestions. A value outside this list is still allowed. */
  items: readonly string[];
  /** Use when controlled. */
  value?: string;
  defaultValue?: string;
  /** Base UI's second argument carries the reason the value changed. */
  onValueChange?: BaseAutocomplete.Root.Props<string>['onValueChange'];
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

  // The list keys on the string, and Base UI does not dedupe.
  const options = useMemo(() => [...new Set(items)], [items]);

  // Opening a filled field should offer the alternatives rather than the one
  // value already in it; a keystroke should narrow. True from the moment the
  // popup opens until the value changes.
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
      // Only a pointer opens into browsing; clicking the input reports
      // trigger-press. A keystroke opens the popup too, and that also fires
      // onValueChange, so leaving the flag alone there keeps the result
      // independent of which handler lands first.
      onOpenChange={(open, details) => {
        if (!open) setBrowsing(false);
        else if (BROWSE_REASONS.includes(details.reason)) setBrowsing(true);
      }}
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
