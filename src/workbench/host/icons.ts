import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import {
  Briefcase,
  ChatCircleDots,
  Database,
  Flask,
  FolderOpen,
  Gear,
  GraduationCap,
  HandWaving,
  House,
  Lightning,
  ListChecks,
  Nut,
  PushPin,
  SquaresFour,
  Table,
} from '@phosphor-icons/react';

// Manifests name an icon; the host owns the table so a plugin cannot pull
// the whole icon set into the bundle. Unknown names fall back to a pin.
export const ICONS: Readonly<Record<string, ComponentType<IconProps>>> = {
  Briefcase,
  ChatCircleDots,
  Database,
  Flask,
  FolderOpen,
  Gear,
  GraduationCap,
  HandWaving,
  House,
  Lightning,
  ListChecks,
  Nut,
  SquaresFour,
  Table,
};

// A manifest names a colour the same way it names an icon: from a table
// the host owns, so the palette stays the design system's. The colour
// marks whose panel this is, at icon size and nowhere else; a plugin that
// names none draws in the ink of whatever it sits in, which is what the
// host's own panels do.
//
// These are the --ct-* values, the ramp meant to be read against the page
// background at AA 4.5:1, with a dark-mode pair. The raw brand colours are
// tints for sitting behind text and go grey at 14px.
export const ICON_COLORS: Readonly<Record<string, string>> = {
  blue: 'var(--ct-primary)',
  green: 'var(--ct-green)',
  teal: 'var(--ct-teal)',
  purple: 'var(--ct-purple)',
  orange: 'var(--ct-orange)',
  red: 'var(--ct-red)',
};

// Duotone draws the glyph over a wash of itself, so one colour gives both
// tones and the icon keeps working against either background.
const WEIGHT = 'duotone' as const;

// Components are cached because a fresh component type on every render
// remounts the SVG, losing nothing visible but doing the work again.
const cache = new Map<string, ComponentType<IconProps>>();

export function iconFor(name: string | undefined, color?: string): ComponentType<IconProps> {
  const key = `${name ?? ''}|${color ?? ''}`;
  const have = cache.get(key);
  if (have) return have;
  const Base = (name && ICONS[name]) || PushPin;
  const tint = color ? ICON_COLORS[color] : undefined;
  const Icon = (props: IconProps) =>
    createElement(Base, { weight: WEIGHT, ...(tint ? { color: tint } : {}), ...props });
  Icon.displayName = `Icon(${name ?? 'pin'})`;
  cache.set(key, Icon);
  return Icon;
}
