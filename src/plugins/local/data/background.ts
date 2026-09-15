import { defineBackground } from '@kbase/plugin-sdk';
import { dataset, datasets } from './data';

// Data volunteers what it actually holds. Unlike an app that recognises an
// identifier shape and looks it up later, this plugin's inventory is in
// front of it, so it answers by name: nothing is offered that is not there
// to open. The one exception is a workspace UPA reaching through the KBase
// 1.0 bridge, offered even when the object is not in the fixtures, because
// the bridge is what would fetch it — and genKnown claims that shape too,
// which is the expected case of two plugins answering one string.
const UPA = /^\d+\/\d+(?:\/\d+)?$/;

const refsIn = (terms: string[]) =>
  terms.flatMap((term) => {
    const ref = term.match(/^(?:dataset|upa):(.+)$/)?.[1];
    return ref ? [{ term, ref }] : [];
  });

export default defineBackground({
  terms: ({ text }) => {
    const q = text.trim();
    if (!q) return [];
    const ref = datasets.find((d) => d.ref.toLowerCase() === q.toLowerCase())?.ref;
    if (ref) return [`dataset:${ref}`];
    if (UPA.test(q)) return [`upa:${q}`];
    const needle = q.toLowerCase();
    if (needle.length < 3) return [];
    // Name, type and narrative: "reads" finds the fastq by type, "74501"
    // finds a narrative's objects, "nifh" finds the hits table by name.
    return datasets
      .filter((d) =>
        `${d.name} ${d.type} ${d.ref} ${d.narrative ?? ''}`.toLowerCase().includes(needle),
      )
      .slice(0, 3)
      .map((d) => `dataset:${d.ref}`);
  },
  // The two cases claim different things: a dataset in the inventory is a
  // `record` — it is there, and the label is its own name and type — while a
  // UPA the fixtures do not hold is an `identifier` in a namespace this
  // plugin serves, which the bridge may or may not resolve.
  offer: ({ terms }) =>
    refsIn(terms).map(({ term, ref }) => {
      const known = dataset(ref);
      return {
        label: known ? `${known.name} (${known.type})` : `KBase 1.0 object ${ref}`,
        command: 'open',
        args: { ref },
        match: { term, kind: known ? ('record' as const) : ('identifier' as const) },
      };
    }),
});
