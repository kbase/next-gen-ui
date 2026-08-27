import { forwardRef, type ComponentPropsWithRef } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import styles from './Button.module.scss';
import { cx } from '../../util/cx';

export type ButtonVariant = 'primary' | 'teal' | 'purple' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends Omit<BaseButton.Props, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * This must stay a forwardRef. React 18 removes `ref` from props before a function component
 * receives it. Base UI passes a ref to whatever element a compound part renders, and several
 * parts render a Button by default (search for `render =`); they need that ref to position
 * their popup. Without forwardRef those parts stop working on React 18: the development build
 * warns, production is silent. The same applies to every wrapper here with a `render =` default.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <BaseButton
      ref={ref}
      className={cx(styles.btn, styles[variant], styles[size], className)}
      {...props}
    >
      {children}
    </BaseButton>
  );
});

export interface ButtonLinkProps extends Omit<ComponentPropsWithRef<'a'>, 'className'> {
  /** Required: an anchor without one is neither focusable nor a link. */
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * A link wearing a button's appearance. Kept separate from `Button` rather than
 * reached through `render`, because Base UI would then either warn about the
 * non-button element or give it `role="button"` — and this navigates, so it is
 * a link.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={cx(styles.btn, styles[variant], styles[size], className)} {...props}>
      {children}
    </a>
  );
}
