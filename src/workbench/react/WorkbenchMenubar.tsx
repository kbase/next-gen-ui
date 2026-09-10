import { KBaseSymbol, Menu, Menubar } from '@kbase/design-system';
import type { Side } from '../core';
import { groupOf } from '../core';
import { useDispatch, useLayout, useRun, useServices } from './context';
import styles from './Workbench.module.css';

// Menus are another surface over the same commands the keyboard and the
// prompt bar reach; nothing here does anything a command cannot.
export function WorkbenchMenubar() {
  const layout = useLayout();
  const run = useRun();
  const dispatch = useDispatch();
  const { source, store } = useServices();
  const focused = layout.focus ? layout.panels[layout.focus] : undefined;
  const group = layout.focus ? groupOf(layout.main, layout.focus) : undefined;
  const canSplit = !!group && group.tabs.length > 1;

  return (
    <div className={styles.menubar} data-density="compact">
      <span className={styles.brand}>
        {/* The KBase symbol, as the style guide draws it. It replaces a stand-in
            built from the Loader's three dots, which read as a spinner at rest
            and had nothing to do with the mark. */}
        <KBaseSymbol className={styles.brandMark} aria-hidden="true" />
        <span aria-hidden="true">KBase</span>
        <span className={styles.srOnly}>KBase Workbench</span>
      </span>
      <Menubar.Root aria-label="Workbench menu">
        <Menu.Root>
          <Menubar.Trigger>Workbench</Menubar.Trigger>
          <Menu.Popup size="sm">
            <Menu.Item disabled={!store.canUndo()} onClick={() => run('workbench:undo')}>
              Undo
            </Menu.Item>
            <Menu.Item disabled={!store.canRedo()} onClick={() => run('workbench:redo')}>
              Redo
            </Menu.Item>
            <Menu.Separator />
            <Menu.CheckboxItem
              checked={layout.locked}
              onCheckedChange={() => run('workbench:lock-layout')}
            >
              Lock layout
            </Menu.CheckboxItem>
            <Menu.Separator />
            <Menu.CheckboxItem
              checked={!layout.sidebar.collapsed}
              onCheckedChange={(v) => dispatch({ type: 'sidebar', collapsed: !v })}
            >
              Sidebar
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              checked={layout.bars.prompt}
              onCheckedChange={(v) => dispatch({ type: 'bar', bar: 'prompt', visible: v })}
            >
              Prompt bar
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              checked={layout.bars.status}
              onCheckedChange={(v) => dispatch({ type: 'bar', bar: 'status', visible: v })}
            >
              Status bar
            </Menu.CheckboxItem>
            <Menu.Separator />
            {/* The host's own page, reached from the menu that governs the
                workbench rather than from the list of things installed in it. */}
            <Menu.Item onClick={() => run('catalog:catalog')}>Settings</Menu.Item>
          </Menu.Popup>
        </Menu.Root>
        <Menu.Root>
          <Menubar.Trigger>Panel</Menubar.Trigger>
          <Menu.Popup size="sm">
            <Menu.Item disabled={!focused || !group} onClick={() => run('workbench:close')}>
              Close
            </Menu.Item>
            <Menu.Separator />
            {(
              [
                ['left', 'Split left'],
                ['right', 'Split right'],
                ['top', 'Split up'],
                ['bottom', 'Split down'],
              ] as Array<[Side, string]>
            ).map(([side, label]) => (
              <Menu.Item
                key={side}
                disabled={!canSplit}
                onClick={() =>
                  run(`workbench:move-${side === 'top' ? 'up' : side === 'bottom' ? 'down' : side}`)
                }
              >
                {label}
              </Menu.Item>
            ))}
            {focused?.kind === 'pane' && group && (
              <>
                <Menu.Separator />
                <Menu.Item
                  onClick={() =>
                    dispatch({ type: 'move', panel: focused.id, to: { zone: 'sidebar' } })
                  }
                >
                  Move to sidebar
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Root>
        <Menu.Root>
          <Menubar.Trigger>Plugins</Menubar.Trigger>
          <Menu.Popup size="sm">
            {source
              .plugins()
              .filter((p) => source.has(p.id, 'pane'))
              .map((p) => {
                const pinned = layout.sidebar.pinned.includes(p.id);
                return (
                  <Menu.CheckboxItem
                    key={p.id}
                    checked={pinned}
                    onCheckedChange={(v) =>
                      dispatch(v ? { type: 'pin', plugin: p.id } : { type: 'unpin', plugin: p.id })
                    }
                  >
                    {p.title}
                  </Menu.CheckboxItem>
                );
              })}
          </Menu.Popup>
        </Menu.Root>
      </Menubar.Root>
    </div>
  );
}
