import { useSyncExternalStore } from 'react';
import { Chip, Tree } from '@kbase/design-system';
import { definePane, fromReact, useHost, usePanelTitle } from '@kbase/plugin-sdk';
import { koros } from './store';
import styles from './koros.module.css';

// KIND*AI's Projects rail, reduced to one flat list of arcs, newest first.
// No folders: a standalone arc is a project of its own there, and nesting it
// under a row of the same name said nothing. The project follows the title
// on the row where it is a different thing from the arc; rows are one line,
// which the tree fixes. On each arc, the one thing that matters at a glance:
// that it needs you, else its stage. New question is the plugin's shortcut,
// in the toolbar the host keeps for such buttons; the arc it opens is a row
// here like any other.
function Arcs() {
  usePanelTitle('Arcs');
  useSyncExternalStore(koros.subscribe, koros.version, koros.version);
  const host = useHost();
  const items = koros.arcs().map((a) => {
    const project = koros.project(a.project)?.title ?? a.project;
    return {
      id: a.slug,
      label: a.title,
      content: (
        <span
          className={styles.row}
          title={project !== a.title ? `${a.title} · ${project}` : a.title}
        >
          {a.title}
          {project !== a.title && (
            <span className={`caption ${styles.rowProject}`}>{` · ${project}`}</span>
          )}
        </span>
      ),
      suffix: a.needsYou ? (
        <Chip color="purple" label="needs you" />
      ) : (
        <span className={`caption ${styles.stage}`}>{a.stage.toLowerCase()}</span>
      ),
    };
  });
  return (
    <div className={styles.pane}>
      <Tree.Root
        aria-label="Arcs"
        items={items}
        selected={koros.current() ?? undefined}
        onSelect={(id) => host.openRoute(`/${id}`)}
      />
    </div>
  );
}

export default definePane(fromReact(Arcs));
