import { describe, expect, it } from 'vitest';
import type { Node } from './layout';
import { groups, insertTab, normalize, removeTab, splitGroup } from './tree';

const g = (id: string, ...tabs: string[]): Node => ({
  kind: 'group',
  id,
  tabs,
  active: tabs[0] ?? null,
});

describe('normalize', () => {
  it('keeps one empty group at the root', () => {
    expect(normalize(g('root'))).toEqual(g('root'));
    const split: Node = {
      kind: 'split',
      id: 's',
      dir: 'row',
      sizes: [0.5, 0.5],
      children: [g('a'), g('b')],
    };
    expect(normalize(split, 'root')).toEqual(g('root'));
  });

  it('unwraps a split left with one child', () => {
    const split: Node = {
      kind: 'split',
      id: 's',
      dir: 'row',
      sizes: [0.5, 0.5],
      children: [g('a', 'x'), g('b')],
    };
    expect(normalize(split)).toEqual(g('a', 'x'));
  });

  it('merges a same-direction child split and scales its sizes', () => {
    const inner: Node = {
      kind: 'split',
      id: 'inner',
      dir: 'row',
      sizes: [0.5, 0.5],
      children: [g('b', 'y'), g('c', 'z')],
    };
    const outer: Node = {
      kind: 'split',
      id: 'outer',
      dir: 'row',
      sizes: [0.5, 0.5],
      children: [g('a', 'x'), inner],
    };
    const result = normalize(outer);
    expect(result.kind).toBe('split');
    if (result.kind !== 'split') return;
    expect(result.children.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(result.sizes).toEqual([0.5, 0.25, 0.25]);
  });

  it('is idempotent', () => {
    const tree = splitGroup(g('root', 'x'), 'root', 'right', 'y', 'g2', 's1');
    expect(normalize(normalize(tree))).toEqual(normalize(tree));
  });
});

describe('tabs', () => {
  it('removing the active tab activates its right-hand neighbour', () => {
    const tree = removeTab(g('root', 'a', 'b', 'c'), 'a');
    expect(groups(tree)[0]).toEqual({ kind: 'group', id: 'root', tabs: ['b', 'c'], active: 'b' });
  });

  it('removing the last tab activates the new last tab', () => {
    const tree = removeTab({ kind: 'group', id: 'root', tabs: ['a', 'b'], active: 'b' }, 'b');
    expect(groups(tree)[0].active).toBe('a');
  });

  it('inserting an existing tab moves it', () => {
    const tree = insertTab(g('root', 'a', 'b', 'c'), 'root', 'a', 2);
    expect(groups(tree)[0].tabs).toEqual(['b', 'c', 'a']);
  });

  it('splitGroup puts the new group on the named side', () => {
    const tree = splitGroup(g('root', 'x'), 'root', 'top', 'y', 'g2', 's1');
    expect(tree.kind).toBe('split');
    if (tree.kind !== 'split') return;
    expect(tree.dir).toBe('col');
    expect(tree.children.map((c) => c.id)).toEqual(['g2', 'root']);
  });
});
