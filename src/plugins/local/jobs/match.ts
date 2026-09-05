import type { Matcher, Offer } from '@kbase/plugin-sdk';
import { jobStore } from './store';

// Jobs, like Data, answers from an inventory it already has. Status is
// part of the label because which run you meant is usually decided by
// whether it is still going.

const offer = (id: string, label: string): Offer => ({ label, action: { id } });

export const match: Matcher = (text) => {
  const q = text.trim();
  if (!q) return [];
  const jobs = jobStore.all();

  // "job 12" or a bare id, but only one that exists — a lone number is
  // far more often something else.
  const id = /^(?:job[: ]?)?(\d{1,6})$/i.exec(q)?.[1];
  const byId = id ? jobs.find((j) => j.id === id) : undefined;
  if (byId) return [offer(byId.id, `${byId.name} — ${byId.status}`)];

  const needle = q.toLowerCase();
  if (needle.length < 3) return [];
  return jobs
    .filter((j) => `${j.name} ${j.app} ${j.status}`.toLowerCase().includes(needle))
    .slice(0, 3)
    .map((j) => offer(j.id, `${j.name} — ${j.status}`));
};
