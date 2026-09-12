import { describe, expect, it } from 'vitest';
import type { Layout } from './layout';
import { defaultLayout, makeRoute, paneId } from './layout';
import type { Operation, OperationType } from './operations';
import { isUndoable } from './operations';
import type { ReduceContext } from './reduce';
import { reduce } from './reduce';

// `open`/`move` mint ids; a fresh counter per reduce keeps them predictable.
function counter(): ReduceContext {
  let n = 0;
  return { newId: () => `id${++n}` };
}

const arc = makeRoute('koros', '/nitro', 'a');
const job = makeRoute('jobs', '/12', 'b');

// 'files' pinned, arc and job side by side so the split 'id2' exists: every
// sample below changes this layout unless a rule stops it.
function fixture(): Layout {
  const ctx = counter();
  let layout = reduce(defaultLayout({ pinned: ['files'] }), { type: 'open', panel: arc }, ctx);
  layout = reduce(
    layout,
    { type: 'open', panel: job, target: { group: 'root', side: 'right' } },
    ctx,
  );
  return layout;
}

// One operation of every type. Keyed by type, so a new member of the
// `Operation` union fails to compile until it is listed here and both sets
// below are decided for it.
const samples: { [T in OperationType]: Extract<Operation, { type: T }> } = {
  open: { type: 'open', panel: makeRoute('koros', '/turbo', 'c') },
  close: { type: 'close', panel: arc.id },
  focus: { type: 'focus', panel: arc.id },
  setPath: { type: 'setPath', panel: arc.id, path: '/other' },
  move: { type: 'move', panel: arc.id, to: { group: 'id1' } },
  resize: { type: 'resize', split: 'id2', sizes: [0.7, 0.3] },
  pin: { type: 'pin', plugin: 'notes' },
  unpin: { type: 'unpin', plugin: 'files' },
  fold: { type: 'fold', panel: paneId('files'), folded: true },
  sidebar: { type: 'sidebar', collapsed: true },
  bar: { type: 'bar', bar: 'status', visible: false },
  bind: { type: 'bind', key: 'mod+k', command: 'workbench:open' },
  lock: { type: 'lock', locked: false },
};

const types = Object.keys(samples) as OperationType[];

describe('the two operation sets', () => {
  it('pushes an undo snapshot for exactly these types', () => {
    expect(types.filter((t) => isUndoable(samples[t]))).toEqual([
      'open',
      'close',
      'move',
      'pin',
      'unpin',
      'fold',
      'bar',
    ]);
  });

  it('a locked layout refuses exactly these types', () => {
    const locked: Layout = { ...fixture(), locked: true };
    // Returning the same object is how reduce says "no change", so an
    // operation that was a no-op anyway would show up here as refused.
    const refused = types.filter((t) => reduce(locked, samples[t], counter()) === locked);
    expect(refused).toEqual(['move', 'resize', 'pin', 'unpin']);

    // ...which is why each refusal is checked against an unlocked layout:
    // the lock is what stopped it, not an empty operation.
    const unlocked = fixture();
    for (const type of refused) {
      expect(reduce(unlocked, samples[type], counter())).not.toBe(unlocked);
    }
  });
});
