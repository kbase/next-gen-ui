import type { KeyboardEvent, MouseEvent } from 'react';
import { X } from '@phosphor-icons/react';
import { Button, ContextMenu, EmptyState, Tabs } from '@kbase/design-system';
import type { Group, Panel, PanelId, Side } from '../core';
import { makePanel } from '../core';
import { useDispatch, useLayout, useServices, useTitle } from './context';
import { Breadcrumbs } from './Breadcrumbs';
import { useGroupLabels } from './useGroupLabels';
import { panelDomId, tabDomId } from './domIds';
import { PanelHost } from './PanelHost';
import { useDragPanel, useDropTarget } from './useDnd';
import { GroupDropZones } from './WorkbenchDnd';
import styles from './Workbench.module.css';

// One tab strip and its panels. Every panel stays mounted and is hidden
// when inactive, so switching tabs keeps scroll positions and iframe state.
export function TabGroup({ group }: { group: Group }) {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { focusIntentRef } = useServices();
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
      dispatch({ type: 'close', panel: group.active });
      return;
    } else return;
    event.preventDefault();
    if (next) dispatch({ type: 'focus', panel: next });
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
                onClick={() => dispatch({ type: 'open', panel: makePanel('home', 'document', {}) })}
              >
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
            onSelect={() => {
              focusIntentRef.current = 'user';
              dispatch({ type: 'focus', panel: id });
            }}
          />
        ))}
        <TabEnd group={group} />
      </div>
      {group.active && <Breadcrumbs panel={group.active} />}
      <div className={styles.groupBody}>
        {group.tabs.map((id) => {
          const panel = layout.panels[id];
          return (
            <div
              key={id}
              role="tabpanel"
              id={panelDomId(id)}
              aria-labelledby={tabDomId(id)}
              hidden={group.active !== id}
              className={styles.tabpanel}
              data-panel={id}
              // Pointer as well as focus: most of a panel is plain text,
              // and clicking it fires no focus event, so the workbench
              // focus would stay wherever it last was.
              onPointerDownCapture={() => {
                if (layout.focus !== id) {
                  focusIntentRef.current = 'user';
                  dispatch({ type: 'focus', panel: id });
                }
              }}
              onFocusCapture={() => {
                if (layout.focus !== id) {
                  focusIntentRef.current = 'user';
                  dispatch({ type: 'focus', panel: id });
                }
              }}
            >
              {panel && <PanelHost panel={panel} focused={layout.focus === id} />}
            </div>
          );
        })}
        <GroupDropZones group={group.id} />
      </div>
    </div>
  );
}

const SIDES: Array<[Side, string]> = [
  ['left', 'Split left'],
  ['right', 'Split right'],
  ['top', 'Split up'],
  ['bottom', 'Split down'],
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
  const { source } = useServices();
  // The negotiated label names the tab; the panel's own title still names
  // it everywhere one tab is described on its own.
  const own = useTitle(panel, id);
  const title = label ?? own;
  const Icon = panel ? source.plugins().find((p) => p.id === panel.plugin)?.icon : undefined;
  const { dragRef, dragHandlers, isDragging } = useDragPanel({
    panel: id,
    kind: panel?.kind ?? 'document',
  });
  const { dropRef, isOver } = useDropTarget({ type: 'tab', group: group.id, index });
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
        <span className={styles.tabTitle}>{title}</span>
        <span className={styles.tabClose} aria-hidden="true" onClick={close} title="Close">
          <X size={12} weight="bold" />
        </span>
      </ContextMenu.Trigger>
      <ContextMenu.Popup aria-label={`${title} actions`}>
        <ContextMenu.Item onClick={() => close()}>Close</ContextMenu.Item>
        <ContextMenu.Separator />
        {SIDES.map(([side, label]) => (
          <ContextMenu.Item
            key={side}
            disabled={alone}
            onClick={() => dispatch({ type: 'move', panel: id, to: { group: group.id, side } })}
          >
            {label}
          </ContextMenu.Item>
        ))}
        {panel?.kind === 'navigator' && (
          <>
            <ContextMenu.Separator />
            <ContextMenu.Item
              onClick={() => dispatch({ type: 'move', panel: id, to: { zone: 'sidebar' } })}
            >
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
