import { useEffect, useSyncExternalStore } from 'react';
import { Chip, Tree } from '@kbase/design-system';
import { definePlugin, useHost, usePanel, usePanelTitle } from '@kbase/plugin-sdk';
import type { PromptContext, StatusItem } from '@kbase/plugin-sdk';
import { koros } from './store';

function useKoros() {
  return useSyncExternalStore(koros.subscribe, koros.version, koros.version);
}

function ProjectsNavigator() {
  usePanelTitle('Projects');
  useKoros();
  const host = useHost();
  const items = koros.projects().map((p) => ({
    id: `project:${p.id}`,
    label: p.title,
    children: koros.arcsOf(p.id).map((a) => ({
      id: `arc:${a.slug}`,
      label: a.title,
      suffix: a.questions.some((q) => !q.answer) ? (
        <Chip color="purple" label="answering" />
      ) : undefined,
    })),
  }));
  return (
    <Tree.Root
      aria-label="Projects and arcs"
      items={items}
      selected={koros.current() ? `arc:${koros.current()}` : undefined}
      defaultExpanded={items.map((i) => i.id)}
      onSelect={(id) => {
        if (id.startsWith('arc:')) host.openDocument({ slug: id.slice(4) });
      }}
    />
  );
}

function ArcDocument() {
  const { params, focused } = usePanel();
  useKoros();
  const arc = koros.arc(params.slug);
  const slug = arc?.slug;
  usePanelTitle(arc ? `Arc: ${arc.title}` : `Arc: ${params.slug}`);
  // An effect, not a render-time call: setCurrent notifies subscribers in
  // other components (the prompt bar's destination row), which React
  // forbids during render.
  useEffect(() => {
    if (focused && slug) koros.setCurrent(slug);
  }, [focused, slug]);
  if (!arc) {
    return (
      <div style={{ padding: 'var(--s-5)' }}>
        <p className="body">No arc is called “{params.slug}”.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: 'var(--s-5)', display: 'grid', gap: 'var(--s-4)' }}>
      <div>
        <p className="caption">{arc.project}</p>
        <h1 className="h2">{arc.title}</h1>
      </div>
      {arc.questions.length === 0 && (
        <p className="body">Nothing asked yet. Type a question in the prompt bar.</p>
      )}
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--s-4)' }}>
        {arc.questions.map((q) => (
          <li key={q.id} style={{ display: 'grid', gap: 'var(--s-2)' }}>
            <p className="body" style={{ fontWeight: 'var(--fw-bold)' }}>
              {q.text}
            </p>
            <p className="body" aria-busy={!q.answer}>
              {q.answer ?? 'Answering…'}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function useStatus(): StatusItem[] {
  useKoros();
  const n = koros.answering();
  return n > 0 ? [{ text: `${n} answering` }] : [];
}

// Mirrors the prompt handler below: free text lands in the current arc,
// else starts a new one. Any arc is offered as a switch target.
function usePromptContext(): PromptContext | null {
  useKoros();
  const slug = koros.current();
  const arc = slug ? koros.arc(slug) : undefined;
  return {
    label: arc ? `Arc: ${arc.title}` : 'A new arc',
    documentParams: arc ? { slug: arc.slug } : undefined,
    options: koros
      .projects()
      .flatMap((p) => koros.arcsOf(p.id))
      .map((a) => ({ key: a.slug, label: `Arc: ${a.title}` })),
    select: (key) => koros.setCurrent(key),
  };
}

export default definePlugin({
  navigator: ProjectsNavigator,
  document: ArcDocument,
  useStatus,
  usePromptContext,
  commands: {
    'new-question': (_values, host) => {
      const arc = koros.newArc();
      host.openDocument({ slug: arc.slug });
    },
  },
  // Free text lands in the current arc; with none, a new arc is started.
  prompt: async ({ text }, host) => {
    const slug = koros.current() ?? koros.newArc().slug;
    koros.ask(slug, text);
    host.openDocument({ slug });
  },
});
