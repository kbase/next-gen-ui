import { forwardRef, useRef, useState } from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { CheckCircle, PlusCircle } from '@phosphor-icons/react';
import buttonStyles from '../Button/Button.module.scss';
import styles from './CartButton.module.scss';
import { cx } from '../../util/cx';

/** The glyph, in px. The pill is 30: 18 + 2 × (5 padding + 1 border). */
const GLYPH = 18;
const PILL = 30;

export interface CartButtonProps extends Omit<
  BaseToggle.Props,
  'className' | 'children' | 'value' | 'render'
> {
  /** The button's name. Defaults to "Add to cart". It does not change when pressed. */
  label?: string;
  /** The words shown once the item is in the cart. Defaults to "In cart". */
  pressedLabel?: string;
  /**
   * Keep the words in the pill instead of showing them on hover. For a
   * prominent placement; in a table the icon form is the resting state.
   */
  labelled?: boolean;
  className?: string;
}

/**
 * A toggle that puts an item in the cart. Base UI's Toggle owns the pressed
 * state, controlled or not, and its keyboard and `aria-pressed` handling; the
 * name stays "Add to cart" and the state says whether it is in. On hover or
 * focus the words appear beside the plus, in a tooltip that overlays the pill,
 * so a row of them never changes width. Base UI flips it to the left when
 * there is no room on the right.
 *
 * forwardRef for the same reason as Button: Base UI reaches the trigger
 * through a ref to position the popup.
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
