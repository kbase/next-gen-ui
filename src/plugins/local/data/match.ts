import type { Matcher, Offer } from '@kbase/plugin-sdk';
import { datasets } from './data';

// Data volunteers what it actually holds. Unlike an app that recognises
// an identifier shape and looks it up later, this plugin's inventory is
// in front of it, so it answers by name: nothing is offered that is not
// there to open.

const offer = (ref: string, label: string): Offer => ({ label, action: { ref } });

// A workspace UPA reaching through the KBase 1.0 bridge. Offered even
// when the object is not in the fixtures, because the bridge is what
// would fetch it; GenKnown claims this shape too, and two plugins
// volunteering for one string is the expected case.
const UPA = /^\d+\/\d+(?:\/\d+)?$/;

export const match: Matcher = (text) => {
  const q = text.trim();
  if (!q) return [];

  const known = datasets.find((d) => d.ref === q);
  if (known) return [offer(known.ref, `${known.name} (${known.type})`)];
  if (UPA.test(q)) return [offer(q, `KBase 1.0 object ${q}`)];

  const needle = q.toLowerCase();
  if (needle.length < 3) return [];
  // Name, type and narrative: "reads" finds the fastq by type, "74501"
  // finds a narrative's objects, "nifh" finds the hits table by name.
  return datasets
    .filter((d) =>
      `${d.name} ${d.type} ${d.ref} ${d.narrative ?? ''}`.toLowerCase().includes(needle),
    )
    .slice(0, 3)
    .map((d) => offer(d.ref, `${d.name} (${d.type})`));
};
