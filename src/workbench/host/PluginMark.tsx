import { createElement } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import { iconFor } from './icons';

// A plugin's mark, resolved at render time from the names its manifest gives.
//
// `iconFor` returns a component type, and building one inside a render body
// is a remount waiting to happen — the lint rule that catches it is right even
// though the lookup is cached. This is the same call behind a component, so
// callers write `<PluginMark icon={...} />` and never hold the type.
export interface PluginMarkProps extends Omit<IconProps, 'ref'> {
  icon: string | undefined;
  color?: string;
}

export function PluginMark({ icon, color, ...props }: PluginMarkProps) {
  return createElement(iconFor(icon, color), props);
}
