// Mock state for the assistant, shaped like KOROS as KIND*AI shows it: a
// project holds arcs; an arc is one research question walked through the
// stages FRAME → INVESTIGATE → DELIVER → DONE, with a session the user steers
// by talking to it. Gates, drift and deliverables are left out of the mock.

// What the user attached to a turn when they sent it, kept as it was at send
// time. Enough of each item to show it; the payload stays in the cart item the
// handler was given.
export interface Attached {
  id: string;
  name: string;
  subject?: string;
  path?: string;
}

export type Stage = 'FRAME' | 'INVESTIGATE' | 'DELIVER' | 'DONE';
export const STAGES: Stage[] = ['FRAME', 'INVESTIGATE', 'DELIVER', 'DONE'];

// One line of the session: the user's, or the session's reply.
export interface Turn {
  id: string;
  by: 'you' | 'koros';
  text: string;
  attached: Attached[];
}

export interface Arc {
  slug: string;
  title: string;
  project: string;
  question: string;
  stage: Stage;
  // What the session does next, as its record says.
  next: string;
  // Blocked on a human decision, such as approving the plan.
  needsYou: boolean;
  // The session is working on a turn.
  working: boolean;
  turns: Turn[];
}

export interface Project {
  id: string;
  title: string;
}

const projects: Project[] = [
  { id: 'soil-isolates', title: 'Soil isolates' },
  { id: 'phage-hunt', title: 'Phage hunt' },
];

const arcs = new Map<string, Arc>([
  [
    'nitro',
    arc({
      slug: 'nitro',
      title: 'Nitrogenase in isolate 12',
      project: 'soil-isolates',
      question: 'Which soil isolates carry nifH, and does isolate 12 fix nitrogen?',
      stage: 'INVESTIGATE',
      next: 'ci-verdict on the nifH screen',
    }),
  ],
  [
    'methanol-dh',
    arc({
      slug: 'methanol-dh',
      title: 'Methanol dehydrogenase variants',
      project: 'soil-isolates',
      question: 'Do the lanthanide-dependent MDH variants cluster by soil pH?',
      stage: 'FRAME',
      next: 'plan-approval',
      needsYou: true,
    }),
  ],
  [
    't4-lysis',
    arc({
      slug: 't4-lysis',
      title: 'T4 lysis timing',
      project: 'phage-hunt',
      question: 'When does T4 lysis start at 30 °C?',
      stage: 'DONE',
      next: 'none',
    }),
  ],
]);

// An arc that has not been asked yet: New question opened it, and the first
// message sent to it is its question.
export const isEmpty = (a: Arc) => a.question === '';

function arc(a: Omit<Arc, 'needsYou' | 'working' | 'turns'> & { needsYou?: boolean }): Arc {
  return {
    ...a,
    needsYou: a.needsYou ?? false,
    working: false,
    turns: [{ id: `${a.slug}-0`, by: 'you', text: a.question, attached: [] }],
  };
}

// The arc named by a path: `/nitro`, with any query or fragment dropped.
// Slugs are lowercase, so case never splits one arc into two panels.
export const slugOf = (path: string) => path.split(/[?#]/)[0].slice(1).toLowerCase();

let currentArc: string | null = 'nitro';
let version = 0;
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

export const koros = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  version: () => version,
  projects: () => projects,
  // Newest first, as KIND*AI sorts its rail.
  arcs: () => [...arcs.values()].reverse(),
  arcsOf: (project: string) => [...arcs.values()].filter((a) => a.project === project),
  project: (id: string) => projects.find((p) => p.id === id),
  arc: (slug: string) => arcs.get(slug),
  current: () => currentArc,
  // The arc free text goes to; null means the next message is a new question.
  setCurrent(slug: string | null) {
    if (currentArc === slug) return;
    currentArc = slug;
    notify();
  },
  working: () => [...arcs.values()].filter((a) => a.working).length,
  needingYou: () => [...arcs.values()].filter((a) => a.needsYou).length,
  // Where the next free-text message lands, for the prompt bar: the current
  // arc's session; every arc is a switch target. New is the bar's own item
  // and calls `newConversation`.
  destination() {
    const arc = currentArc ? arcs.get(currentArc) : undefined;
    return {
      label: arc ? arc.title : 'New question',
      path: arc ? `/${arc.slug}` : undefined,
      options: [...arcs.values()].map((a) => ({ key: a.slug, label: a.title })),
      select: (key: string) => koros.setCurrent(key),
    };
  },
  // New question: an arc with no question yet, its own page, and the place the
  // next message lands. An empty one already open is that arc; a second would
  // be a second blank page. Standing alone, it is a project of its own, which
  // is how KIND*AI files an arc not filed under a project.
  newArc(): Arc {
    const empty = [...arcs.values()].find(isEmpty);
    if (empty) {
      currentArc = empty.slug;
      notify();
      return empty;
    }
    let n = 1;
    while (arcs.has(`new-${n}`)) n += 1;
    const slug = `new-${n}`;
    projects.push({ id: slug, title: 'New question' });
    const created: Arc = {
      slug,
      title: 'New question',
      project: slug,
      question: '',
      stage: 'FRAME',
      next: 'your question',
      needsYou: false,
      working: false,
      turns: [],
    };
    arcs.set(slug, created);
    currentArc = slug;
    notify();
    return created;
  },
  // Cross the human-only gate: the plan is approved and INVESTIGATE begins.
  approve(slug: string) {
    const target = arcs.get(slug);
    if (!target || !target.needsYou) return;
    target.needsYou = false;
    target.stage = 'INVESTIGATE';
    target.next = 'data-validity';
    target.turns = [
      ...target.turns,
      { id: `${slug}-${target.turns.length}`, by: 'you', text: 'Plan approved.', attached: [] },
      {
        id: `${slug}-${target.turns.length + 1}`,
        by: 'koros',
        text: 'INVESTIGATE: running the plan. Next gate: data-validity. (Mock.)',
        attached: [],
      },
    ];
    notify();
  },
  // A message to the session: a turn of the user's, answered a moment later.
  // To an arc not yet asked it is the question: the arc takes its name from
  // it, as KIND*AI names an arc from its question, and FRAME begins, which a
  // moment later needs the plan approved.
  steer(slug: string, text: string, attached: Attached[] = []) {
    const target = arcs.get(slug);
    if (!target) return;
    const asking = isEmpty(target);
    if (asking) {
      target.question = text;
      target.title = text.length > 48 ? `${text.slice(0, 47)}…` : text;
      const own = projects.find((p) => p.id === target.project);
      if (own && own.title === 'New question') own.title = target.title;
      target.next = 'check-commons';
    }
    target.turns = [
      ...target.turns,
      { id: `${slug}-${target.turns.length}`, by: 'you', text, attached },
    ];
    target.working = true;
    target.needsYou = false;
    notify();
    if (asking) {
      window.setTimeout(() => {
        target.turns = [
          ...target.turns,
          {
            id: `${slug}-${target.turns.length}`,
            by: 'koros',
            text: 'FRAME: nothing in the commons answers this yet. Here is a plan; approve it to begin.',
            attached: [],
          },
        ];
        target.next = 'plan-approval';
        target.needsYou = true;
        target.working = false;
        notify();
      }, 1500);
      return;
    }
    window.setTimeout(() => {
      // The mock reply names what it was given, so the cart's round trip is
      // visible end to end rather than only in the composer.
      const named = attached.map((a) => a.subject ?? a.name).join(', ');
      target.turns = [
        ...target.turns,
        {
          id: `${slug}-${target.turns.length}`,
          by: 'koros',
          text: attached.length
            ? `Noted. Reasoning over ${attached.length} attached ${
                attached.length === 1 ? 'item' : 'items'
              }: ${named}. (Mock reply.)`
            : 'Noted. A real session would act on that here. (Mock reply.)',
          attached: [],
        },
      ];
      target.working = false;
      notify();
    }, 1500);
  },
};
