// jsdom does not compute layout, so a test here cannot check that one overlay covers another.
// These check the two facts about the scale that a wrong value would break silently.
import tokens from './tokens.css?raw';

const value = (name: string) => {
  const found = tokens.match(new RegExp(`${name}:\\s*(\\d+)`));
  if (!found) throw new Error(`${name} is not declared in tokens.css`);
  return Number(found[1]);
};

describe('the stacking scale', () => {
  it('ranks an anchored overlay above a modal, so one opened inside a dialog is visible', () => {
    expect(value('--z-anchored')).toBeGreaterThan(value('--z-modal'));
  });

  it('puts no layer between the scrim and the modal it dims', () => {
    const scrim = value('--z-scrim');
    const modal = value('--z-modal');
    const between = ['--z-raised', '--z-anchored', '--z-toast']
      .map(value)
      .filter((v) => v > scrim && v < modal);
    expect(between).toEqual([]);
  });
});
