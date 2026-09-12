import { useEffect, useSyncExternalStore } from 'react';
import { Button, Chip } from '@kbase/design-system';
import {
  defineRoute,
  fromReact,
  qualifyCommand,
  usePanel,
  usePanelTitle,
  useHost,
} from '@kbase/plugin-sdk';
import { STAGES, isEmpty, koros, slugOf } from './store';
import styles from './koros.module.css';

// An arc as KIND*AI's session view shows it: the question, where it stands
// in the stages, what needs you, and the turns so far. Gates, drift and
// deliverables are not in the mock. A new question is not a page: it is the
// prompt bar with its destination set to one.
function ArcPage() {
  const { path, focused } = usePanel();
  const host = useHost();
  useSyncExternalStore(koros.subscribe, koros.version, koros.version);
  const slugAsked = slugOf(path);
  const arc = koros.arc(slugAsked);
  const slug = arc?.slug;
  usePanelTitle(arc ? (isEmpty(arc) ? 'New question' : `Arc: ${arc.title}`) : `Arc: ${slugAsked}`);
  // An effect, not a render-time call: setCurrent notifies subscribers in
  // other components (the prompt bar's destination row), which React
  // forbids during render.
  useEffect(() => {
    if (focused && slug) koros.setCurrent(slug);
  }, [focused, slug]);
  if (!arc) {
    return (
      <div className={styles.page}>
        <p className="body">No arc is called “{slugAsked}”.</p>
      </div>
    );
  }
  const project = koros.projects().find((p) => p.id === arc.project)?.title ?? arc.project;
  if (isEmpty(arc)) {
    return (
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className="h2">New question</h1>
          <p className="body">
            Ask KOROS a research question in the prompt bar below. It frames the question first,
            with what the commons already knows, then a plan for you to approve.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      {/* A standalone arc is a project of its own with the same name, so the
          caption would repeat the title. The question is the first turn. */}
      <div className={styles.head}>
        {project !== arc.title && <p className="caption">{project}</p>}
        <h1 className="h2">{arc.title}</h1>
      </div>

      <ol className={styles.stages} aria-label="Stages">
        {STAGES.map((stage) => (
          <li key={stage}>
            <Chip color={stage === arc.stage ? 'primary' : 'neutral'} label={stage} />
          </li>
        ))}
        {arc.needsYou ? (
          <li>
            <Chip color="purple" label={`needs you: ${arc.next}`} />
          </li>
        ) : (
          arc.next !== 'none' && <li className="caption">{`next: ${arc.next}`}</li>
        )}
      </ol>

      <ol className={styles.turns} aria-label="Session">
        {arc.turns.map((turn) => (
          <li key={turn.id} className={styles.turn} data-by={turn.by}>
            <p className={styles.by}>{turn.by === 'you' ? 'You' : 'KOROS'}</p>
            <p className="body">{turn.text}</p>
            {/* What was in the cart when this was sent, on the turn it was
                sent with. Each one goes back to the thing it names: the item
                carries a command and the plugin that owns it, and `execute`
                crosses plugins where `openRoute` does not. An item added
                without a source is a label, since there is nothing to run. */}
            {turn.attached.length > 0 && (
              <ul className={styles.attached}>
                {turn.attached.map((a) => {
                  const from = a.source;
                  return (
                    <li key={a.id}>
                      {from ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            void host.execute(qualifyCommand(from.command, from.plugin), from.args)
                          }
                        >
                          {a.subject ?? a.name}
                        </Button>
                      ) : (
                        <Chip color="neutral" label={a.subject ?? a.name} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
        {arc.working && (
          <li className={styles.turn} data-by="koros" aria-busy="true">
            <p className={styles.by}>KOROS</p>
            <p className="body">Working…</p>
          </li>
        )}
      </ol>
      {arc.needsYou && (
        <div className={styles.askRow}>
          <Button variant="primary" size="sm" onClick={() => koros.approve(arc.slug)}>
            Approve plan
          </Button>
          <p className="caption">Or just tell the session: type in the prompt bar.</p>
        </div>
      )}
    </div>
  );
}

export default defineRoute({ ...fromReact(ArcPage), normalize: slugOf });
