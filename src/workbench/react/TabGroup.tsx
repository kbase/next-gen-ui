import type { KeyboardEvent, MouseEvent } from 'react';
import { House, X } from '@phosphor-icons/react';
import { Button, ContextMenu, EmptyState, Tabs } from '@kbase/design-system';
import type { Group, Panel, PanelId } from '../core';
import { openRoute } from '../host/open';
import { useDispatch, useLayout, useRun, useServices, useTitle } from './context';
import { Breadcrumbs } from './Breadcrumbs';
import { useGroupLabels } from './useGroupLabels';
import { panelDomId, tabDomId } from './domIds';
import { usePanelSlot } from './panelSlots';
import { useDragPanel, useDropTarget } from './useDnd';
import { GroupDropZones } from './WorkbenchDnd';
import styles from './Workbench.module.css';

// One tab strip and the boxes its panels are drawn over. Every panel stays
// mounted and is hidden when inactive, so switching tabs keeps scroll
// positions and whatever else the panel holds.
export function TabGroup({ group }: { group: Group }) {
  const layout = useLayout();
  const dispatch = useDispatch();
  const run = useRun();
  const services = useServices();
  const focused = layout.focus !== null && group.tabs.includes(layout.focus);
  // A tab's label depends on its neighbours, so it is settled for the
  // group rather than by each tab for itself.
  const labels = useGroupLabels(group.tabs);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!group.active || event.ctrlKey || event.altKey || event.metaKey) return;
    const at = group.tabs.indexOf(group.active);
    let next: PanelId | undefined;
    if (event.key === 'ArrowRight') next = group.tabs[(at + 1) % group.tabs.length];
    else if (event.key === 'ArrowLeft')
      next = group.tabs[(at - 1 + group.tabs.length) % group.tabs.length];
    else if (event.key === 'Home') next = group.tabs[0];
    else if (event.key === 'End') next = group.tabs[group.tabs.length - 1];
    else if (event.key === 'Delete') {
      event.preventDefault();
      // A keybinding like any other, except that the strip it fires in
      // names the tab: Alt+Shift+W closes what is focused, Delete closes
      // the tab this strip is on.
      void run('workbench:close', { panel: group.active });
      return;
    } else return;
    event.preventDefault();
    // The caret follows the arrow keys along the strip, which is what the
    // roving tab order is for, so this is not the user placing it.
    if (next) dispatch({ type: 'focus', panel: next, by: 'command' });
  };

  if (group.tabs.length === 0) {
    return (
      <div className={styles.group} data-group={group.id}>
        <div className={styles.groupBody}>
          <EmptyState
            title="Nothing open"
            description="Pick something in the sidebar, type into the prompt bar, or browse everything installed."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => void openRoute(services, 'home', '/')}
              >
                <House size={14} aria-hidden="true" />
                Browse
              </Button>
            }
          />
          <GroupDropZones group={group.id} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.group} data-group={group.id} data-focused={focused || undefined}>
      <div
        role="tablist"
        aria-label="Open panels"
        className={`${Tabs.tabClasses.listDividers} ${styles.tablist}`}
        onKeyDown={onKeyDown}
      >
        {group.tabs.map((id, index) => (
          <Tab
            key={id}
            group={group}
            index={index}
            panel={layout.panels[id]}
            id={id}
            active={group.active === id}
            focused={layout.focus === id}
            label={labels[id]}
            onSelect={() => dispatch({ type: 'focus', panel: id, by: 'user' })}
          />
        ))}
        <TabEnd group={group} />
      </div>
      {group.active && <Breadcrumbs panel={group.active} />}
      <div className={styles.groupBody}>
        {group.tabs.map((id) => (
          <TabPanelSlot key={id} panel={layout.panels[id]} id={id} active={group.active === id} />
        ))}
        <GroupDropZones group={group.id} />
      </div>
    </div>
  );
}

// Where this tab's panel is drawn, not what draws it: the body lives in the
// layer and is laid over this box, so a tab moved to another group changes
// which box its body follows and not what its body hangs from. The tabpanel
// role, and the id the tab's `aria-controls` names, travel with the body.
function TabPanelSlot({
  panel,
  id,
  active,
}: {
  panel: Panel | undefined;
  id: PanelId;
  active: boolean;
}) {
  const slot = usePanelSlot<HTMLDivElement>(
    panel
      ? {
          panel,
          hidden: !active,
          activates: true,
          shape: 'group',
          role: 'tabpanel',
          labelledBy: tabDomId(id),
        }
      : null,
  );
  return <div ref={slot} hidden={!active} className={styles.tabpanel} data-panel-slot={id} />;
}

// The Panel menu's splits, aimed at this tab rather than the focused one.
const SPLITS: Array<[command: string, label: string]> = [
  ['workbench:move-left', 'Split left'],
  ['workbench:move-right', 'Split right'],
  ['workbench:move-up', 'Split up'],
  ['workbench:move-down', 'Split down'],
];

function Tab({
  group,
  index,
  panel,
  id,
  active,
  focused,
  label,
  onSelect,
}: {
  group: Group;
  index: number;
  panel: Panel | undefined;
  id: PanelId;
  active: boolean;
  focused: boolean;
  label: string | undefined;
  onSelect: () => void;
}) {
  const dispatch = useDispatch();
  const run = useRun();
  const { source } = useServices();
  // The negotiated label names the tab; the panel's own title still names
  // it everywhere one tab is described on its own.
  const own = useTitle(panel, id);
  const title = label ?? own;
  const Icon = panel ? source.plugins().find((p) => p.id === panel.plugin)?.icon : undefined;
  const { dragRef, dragHandlers, isDragging } = useDragPanel({
    panel: id,
    kind: panel?.kind ?? 'route',
  });
  const { dropRef, isOver } = useDropTarget({ type: 'tab', group: group.id, index });
  // The X and the middle click are gestures on this tab, not named actions;
  // the menu item beside them carries the word "Close" and runs the command.
  const close = (event?: MouseEvent) => {
    event?.stopPropagation();
    dispatch({ type: 'close', panel: id });
  };
  const alone = group.tabs.length < 2;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={
          <button
            type="button"
            role="tab"
            id={tabDomId(id)}
            aria-selected={active}
            aria-controls={panelDomId(id)}
            tabIndex={active ? 0 : -1}
            data-panel-tab={id}
            data-selected={active || undefined}
            data-focused={focused || undefined}
            data-dragging={isDragging || undefined}
            data-over={isOver || undefined}
            className={`${Tabs.tabClasses.tab} ${styles.tab}`}
            ref={(el) => {
              dragRef(el);
              dropRef(el);
            }}
            onClick={onSelect}
            onAuxClick={(e) => e.button === 1 && close(e)}
            {...dragHandlers}
          />
        }
      >
        {Icon && (
          <span className={styles.tabIcon} aria-hidden="true">
            <Icon size={13} />
          </span>
        )}
        <span>{title}</span>
        <span className={styles.tabClose} aria-hidden="true" onClick={close}>
          <X size={12} weight="bold" />
        </span>
      </ContextMenu.Trigger>
      <ContextMenu.Popup aria-label={`${title} actions`}>
        <ContextMenu.Item onClick={() => run('workbench:close', { panel: id })}>
          Close
        </ContextMenu.Item>
        <ContextMenu.Separator />
        {SPLITS.map(([command, label]) => (
          <ContextMenu.Item
            key={command}
            disabled={alone}
            onClick={() => run(command, { panel: id })}
          >
            {label}
          </ContextMenu.Item>
        ))}
        {panel?.kind === 'pane' && (
          <>
            <ContextMenu.Separator />
            {/* The tab the menu was opened over need not be the focused
                panel, so the command is told which one to move. */}
            <ContextMenu.Item onClick={() => run('workbench:move-to-sidebar', { panel: id })}>
              Move to sidebar
            </ContextMenu.Item>
          </>
        )}
      </ContextMenu.Popup>
    </ContextMenu.Root>
  );
}

// The empty strip after the last tab: dropping there appends.
function TabEnd({ group }: { group: Group }) {
  const { dropRef, isOver } = useDropTarget({
    type: 'tab',
    group: group.id,
    index: group.tabs.length,
  });
  return <div ref={dropRef} className={styles.tabEnd} data-over={isOver || undefined} />;
}
