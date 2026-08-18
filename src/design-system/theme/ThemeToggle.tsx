import { Sun, Moon, Desktop } from '@phosphor-icons/react';
import { SegmentedControl } from '../components/SegmentedControl';
import { useTheme } from './useTheme';
import type { ThemeChoice } from './useTheme';

export interface ThemeToggleProps {
  className?: string;
}

const OPTIONS = [
  { value: 'system', label: 'Match system', icon: <Desktop size={15} weight="bold" /> },
  { value: 'light', label: 'Light', icon: <Sun size={15} weight="bold" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={15} weight="bold" /> },
];

/**
 * Three states, not two: a two-way switch cannot express "follow the OS",
 * so a user who wants that has to keep re-picking whenever the OS flips.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  return (
    <SegmentedControl
      className={className}
      options={OPTIONS}
      value={theme}
      onChange={(v) => setTheme(v as ThemeChoice)}
    />
  );
}
