import { describe, expect, it } from 'vitest';
import { negotiateLabels } from './labels';
import type { TabEntry } from './labels';

const tab = (id: string, title: string, ...trail: string[]): TabEntry => ({
  id,
  title,
  trail: trail.map((label) => ({ label })),
});

describe('negotiateLabels', () => {
  it('leaves a title alone when nothing else claims it', () => {
    const labels = negotiateLabels([
      tab('a', 'P0A7B8', 'Proteins', 'P0A7B8', 'Structure'),
      tab('b', 'Assemble reads'),
    ]);
    expect(labels).toEqual({ a: 'P0A7B8', b: 'Assemble reads' });
  });

  it('borrows the deepest crumb that differs', () => {
    const labels = negotiateLabels([
      tab('a', 'P0A7B8', 'Proteins', 'P0A7B8', 'Structure'),
      tab('b', 'P0A7B8', 'Proteins', 'P0A7B8', 'Evidence'),
    ]);
    expect(labels).toEqual({ a: 'Structure · P0A7B8', b: 'Evidence · P0A7B8' });
  });

  // The deepest difference, not the first: two proteins at the same view
  // are told apart by the protein, and the shared view stays unsaid.
  it('skips levels the tabs agree on', () => {
    const labels = negotiateLabels([
      tab('a', 'Structure', 'Proteins', 'P0A7B8', 'Structure'),
      tab('b', 'Structure', 'Proteins', 'P0A7C1', 'Structure'),
    ]);
    expect(labels).toEqual({ a: 'P0A7B8 · Structure', b: 'P0A7C1 · Structure' });
  });

  it('numbers what no trail separates', () => {
    const labels = negotiateLabels([tab('a', 'Report'), tab('b', 'Report')]);
    expect(labels).toEqual({ a: 'Report (1)', b: 'Report (2)' });
  });

  // Three tabs, two of which the trail cannot separate: only those two are
  // numbered, and the one the trail does distinguish keeps its crumb.
  it('numbers only what is still ambiguous after borrowing', () => {
    const labels = negotiateLabels([
      tab('a', 'Structure', 'Proteins', 'P0A7B8', 'Structure'),
      tab('b', 'Structure', 'Proteins', 'P0A7B8', 'Structure'),
      tab('c', 'Structure', 'Proteins', 'P0A7C1', 'Structure'),
    ]);
    expect(labels.c).toBe('P0A7C1 · Structure');
    expect([labels.a, labels.b]).toEqual(['P0A7B8 · Structure (1)', 'P0A7B8 · Structure (2)']);
  });

  // A borrowed crumb that repeats the title says nothing, so that tab
  // falls through to numbering with the trail-less one beside it.
  it('does not borrow a crumb equal to the title', () => {
    const labels = negotiateLabels([tab('a', 'Report', 'Files', 'Report'), tab('b', 'Report')]);
    expect(labels).toEqual({ a: 'Report (1)', b: 'Report (2)' });
  });
});
