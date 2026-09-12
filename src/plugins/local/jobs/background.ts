import { defineBackground } from '@kbase/plugin-sdk';
import { jobStore } from './store';

// Jobs answers from an inventory it already holds, so a term is minted only
// for a job that exists: "job 12" anywhere in the text, a bare id as the
// whole text, and a name or app fragment of three characters or more. A
// lone number that names no job is far more often something else.
const idsIn = (terms: string[]) => terms.flatMap((t) => t.match(/^job:(\d+)$/)?.[1] ?? []);

export default defineBackground({
  terms: ({ text }) => {
    const q = text.trim();
    if (!q) return [];
    const jobs = jobStore.all();
    const id = (/\bjob[: #]*(\d{1,6})\b/i.exec(q) ?? /^(\d{1,6})$/.exec(q))?.[1];
    if (id) return jobs.some((j) => j.id === id) ? [`job:${id}`] : [];
    const needle = q.toLowerCase();
    if (needle.length < 3) return [];
    return jobs
      .filter((j) => `${j.name} ${j.app} ${j.status}`.toLowerCase().includes(needle))
      .slice(0, 3)
      .map((j) => `job:${j.id}`);
  },
  // Status is part of the label because which run you meant is usually
  // decided by whether it is still going.
  offer: ({ terms }) =>
    idsIn(terms).flatMap((id) => {
      const job = jobStore.get(id);
      return job
        ? [{ label: `${job.name} — ${job.status}`, command: 'open', args: { id: job.id } }]
        : [];
    }),
  // The store notifies once a second while anything runs, but the line only
  // moves when the count does, so the count is what is compared: a push is
  // a change as far as the host is concerned.
  status: (set) => {
    let shown = -1;
    const push = () => {
      const n = jobStore.running();
      if (n === shown) return;
      shown = n;
      set(n > 0 ? [{ text: `${n} running` }] : []);
    };
    push();
    return jobStore.subscribe(push);
  },
});
