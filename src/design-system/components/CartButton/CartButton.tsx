import { forwardRef, useRef, useState } from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { CheckCircle, PlusCircle } from '@phosphor-icons/react';
import buttonStyles from '../Button/Button.module.scss';
import styles from './CartButton.module.scss';
import { cx } from '../../util/cx';

/* The glyph and the pill, in px. 30 = 18 + 2 × (5 padding + 1 border); the
   padding and border are set in CartButton.module.scss. */
const GLYPH = 18;
const PILL = 30;

export interface CartButtonProps extends Omit<
  BaseToggle.Props,
  'className' | 'children' | 'value' | 'render'
> {
  /**
   * The accessible name of the icon form, and the labelled form's words at
   * rest. Defaults to "Add to cart".
   */
  label?: string;
  /** The words shown once the item is in the cart. Defaults to "In cart". */
  pressedLabel?: string;
  /**
   * Words stay in the pill and the popup is off. For a prominent placement;
   * the icon form is for tables and tight rows.
   */
  labelled?: boolean;
  className?: string;
}

/**
 * A toggle that puts an item in the cart. Base UI's Toggle owns the pressed
 * state, controlled or not, and its keyboard and `aria-pressed` handling. The
 * icon form keeps one name, `label`, and `aria-pressed` carries the state; the
 * labelled form is named by its visible words, which change with the state.
 * On hover or focus the icon form's words appear beside the glyph, in a
 * tooltip that overlays the pill, so a row of them never changes width. Base
 * UI flips it to the left when there is no room on the right.
 *
 * forwardRef so a Base UI part can take this as its `render` element on
 * React 18; see Button.
 */
export const CartButton = forwardRef<HTMLButtonElement, CartButtonProps>(function CartButton(
  {
    label = 'Add to cart',
    pressedLabel = 'In cart',
    labelled,
    pressed,
    defaultPressed = false,
    onPressedChange,
    className,
    ...props
  },
  ref,
) {
  /* The Toggle holds the state; this mirrors it only because the popup is
     portaled and cannot read the trigger's data-pressed. Uncontrolled unless
     `pressed` is given, like the Toggle. */
  const [own, setOwn] = useState(defaultPressed);
  const isPressed = pressed ?? own;
  const trigger = useRef<HTMLButtonElement | null>(null);

  const Glyph = isPressed ? CheckCircle : PlusCircle;
  const words = isPressed ? pressedLabel : label;

  return (
    <BaseTooltip.Root disabled={labelled}>
      <BaseTooltip.Trigger
        delay={0}
        closeDelay={0}
        render={
          <BaseToggle
            ref={(el: HTMLButtonElement | null) => {
              trigger.current = el;
              if (typeof ref === 'function') ref(el);
              else if (ref) ref.current = el;
            }}
            pressed={isPressed}
            onPressedChange={(next, details) => {
              if (pressed === undefined) setOwn(next);
              onPressedChange?.(next, details);
            }}
            aria-label={labelled ? undefined : label}
            data-labelled={labelled || undefined}
            className={cx(buttonStyles.btn, buttonStyles.outline, styles.pill, className)}
            {...props}
          />
        }
      >
        <PlusCircle size={GLYPH} weight="bold" className={styles.plus} aria-hidden />
        <CheckCircle size={GLYPH} weight="bold" className={styles.check} aria-hidden />
        {labelled && words}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className={styles.positioner}
          side="right"
          align="center"
          sideOffset={-PILL}
        >
          {/* A picture of the trigger, so hidden from assistive tech. A click on
              it is a click on the trigger; mousedown is cancelled so focus
              stays where it was. */}
          <BaseTooltip.Popup
            className={styles.popup}
            aria-hidden
            data-pressed={isPressed || undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => trigger.current?.click()}
          >
            <Glyph size={GLYPH} weight="bold" />
            {words}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
});
