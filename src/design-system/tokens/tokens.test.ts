import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { themeInitScript } from '../theme/useTheme';

const root = join(__dirname, '..', '..', '..');
const tokens = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

/** Declarations inside the rule that follows `marker`, normalised for comparison. */
function declarationsAfter(marker: string): string[] {
  const start = tokens.indexOf(marker);
  expect(start, `marker not found: ${marker}`).toBeGreaterThan(-1);
  const open = tokens.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < tokens.length; i++) {
    if (tokens[i] === '{') depth++;
    else if (tokens[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  return tokens
    .slice(open + 1, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((d) => d.replace(/\s+/g, ' ').trim())
    .filter((d) => d.startsWith('--') || d.startsWith('color-scheme'));
}

describe('dark theme', () => {
  // the two dark blocks are hand-maintained copies
  it('declares the same values under the media query and the explicit stamp', () => {
    const viaMedia = declarationsAfter(":root:not([data-theme='light'])");
    const viaStamp = declarationsAfter("\n:root[data-theme='dark']");
    expect(viaMedia.length).toBeGreaterThan(20);
    expect(viaStamp).toEqual(viaMedia);
  });
});

describe('themeInitScript', () => {
  // index.html cannot import it, so it carries a copy
  it('matches the copy inlined in index.html', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const squash = (s: string) => s.replace(/\s+/g, '');
    expect(squash(html)).toContain(squash(themeInitScript));
  });
});
