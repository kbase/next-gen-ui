import { useRef, useSyncExternalStore } from 'react';
import type { ReactElement, RefObject } from 'react';
// Chrome glyphs come straight from Phosphor, never from the host's icon
// table — the table is the plugins' namespace (host/icons.ts).
import { CaretDown, DotsThree, PushPin, X } from '@phosphor-icons/react';
import {
  Button,
  ContextMenu,
  EmptyState,
  Menu,
  NavIcon,
  Popover,
  Toolbar,
} from '@kbase/design-system';
import type { Panel, PluginId } from '../core';
import { makePane, sidebarPanels } from '../core';
import type { PluginInfo } from '../host/installed';
import { useDispatch, useLayout, useRun, useServices, useTitle } from './context';
import { panelDomId } from './domIds';
import { usePanelSlot } from './panelSlots';
import { SplitView } from './SplitView';
import { useDragPanel, useDragging, useDropTarget } from './useDnd';
import styles from './Workbench.module.css';

// The sidebar: the pinned plugins' navigators stacked as blocks, each
// carrying its own icon in its header. Collapsed, the same list becomes an
// icon column — the rail is the folded form of the sidebar, not a separate
// control strip. A block folds to its header and never hides; leaving the
// sidebar means unpinning. Unpinned plugins sit under "More" and pop out
// without touching the layout.
export function Sidebar() {
  const layout = useLayout();
  const dispatch = useDispatch();
  const run = useRun();
  const { source, preview: previewHandle } = useServices();
  useSyncExternalStore(source.subscribe, source.version, source.version);
  const { sidebar } = layout;
  const plugins = source.plugins();
  const infoOf = (id: PluginId) => plugins.find((p) => p.id === id);
  const withNavigator = plugins.filter((p) => source.has(p.id, 'pane'));
  const unpinned = withNavigator.filter((p) => !sidebar.pinned.includes(p.id));
  const blocks = sidebarPanels(layout);
  const dragging = useDragging();
  // The region below the blocks is the end slot: dropping there moves a
  // navigator to the last pin position (for a main-area navigator that is
  // an append, as before).
  const { dropRef, isOver } = useDropTarget(
    { type: 'pin', index: sidebar.pinned.length },
    dragging?.kind !== 'pane',
  );
  const preview = useSyncExternalStore(
    previewHandle.subscribe,
    previewHandle.get,
    previewHandle.get,
  );
  const previewing = preview && !sidebar.pinned.includes(preview) ? preview : null;
  const onPreview = previewHandle.set;
  const onDismissPreview = () => previewHandle.set(null);
  // Anchors the collapsed preview flyout to the ⋯ icon that opened it.
  const moreAnchorRef = useRef<HTMLSpanElement>(null);

  // Both states stay mounted. One width animates — the container's — and
  // the two layers crossfade: the rail is a fixed-width overlay (its icons
  // are never clipped mid-animation) and the blocks keep their full width,
  // cropped by the container, so nothing inside re-lays-out.
  return (
    <div
      className={styles.sidebar}
      data-density="compact"
      data-collapsed={sidebar.collapsed || undefined}
      style={{ width: sidebar.collapsed ? 48 : sidebar.width }}
    >
      <Toolbar.Root
        orientation="vertical"
        className={styles.iconColumn}
        aria-label="Pinned plugins"
      >
        {sidebar.pinned.map((plugin) => {
          const info = infoOf(plugin);
          const label = info?.title ?? plugin;
          const Icon = info?.icon ?? PushPin;
          return (
            <PanePopout
              key={plugin}
              panel={makePane(plugin)}
              label={label}
              // No leading glyph in the header: the rail icon this flew out
              // from is right beside it and already is one.
              trigger={
                <Toolbar.Button
                  render={
                    <NavIcon aria-label={label}>
                      <Icon size={18} aria-hidden="true" />
                    </NavIcon>
                  }
                />
              }
            />
          );
        })}
        {unpinned.length > 0 && (
          <span ref={moreAnchorRef} style={{ display: 'inline-flex' }}>
            <MoreMenu plugins={unpinned} onPreview={onPreview} />
          </span>
        )}
      </Toolbar.Root>

      {/* Collapsed, a preview flies out beside the ⋯ icon like the pinned
          popouts; the layout — and the collapsed state — are untouched. The
          two are alternatives, never both: a pane is drawn in one place. */}
      {sidebar.collapsed && previewing && (
        <PanePopout
          panel={makePane(previewing)}
          label={infoOf(previewing)?.title ?? previewing}
          name={`${infoOf(previewing)?.title ?? previewing} preview`}
          icon={infoOf(previewing)?.icon ?? PushPin}
          anchor={moreAnchorRef}
          open
          onPin={() => {
            void run('workbench:pin', { plugin: previewing });
            onDismissPreview();
          }}
          onDismiss={onDismissPreview}
        />
      )}

      <div
        ref={dropRef}
        className={styles.blocks}
        style={{ width: sidebar.width }}
        role="region"
        aria-label="Sidebar"
        data-over={isOver || undefined}
      >
        <div className={styles.accordion}>
          {blocks.length === 0 ? (
            <EmptyState
              icon={<PushPin size={32} />}
              title="Nothing pinned"
              description="Open More to add a plugin."
            />
          ) : (
            <SplitView
              dir="col"
              className={styles.blockStack}
              sizes={blocks.map((b) => sidebar.sizes[b.plugin] ?? 1)}
              // Folded blocks and content-fit panes keep natural height;
              // only the rest share the stack. A pane's fit is known once
              // its module has loaded, which showing it does.
              fixed={blocks.map(
                (b) =>
                  sidebar.folded.includes(b.id) ||
                  source.loaded(b.plugin, 'pane')?.fit === 'content',
              )}
              // Slot identity travels with the block, not its position, so
              // a reorder keeps each Block's (and its plugin's) mounted
              // state instead of remounting everything after the move.
              ids={blocks.map((b) => b.id)}
              onSizes={(sizes) =>
                dispatch({
                  type: 'sidebar',
                  sizes: Object.fromEntries(blocks.map((b, i) => [b.plugin, sizes[i]])),
                })
              }
              label="sidebar blocks"
            >
              {blocks.map((panel) => (
                <Block key={panel.id} panel={panel} info={infoOf(panel.plugin)} />
              ))}
            </SplitView>
          )}
          {unpinned.length > 0 && (
            <MoreMenu plugins={unpinned} variant="row" onPreview={onPreview} />
          )}
        </div>

        {previewing && !sidebar.collapsed && (
          <PreviewBlock
            plugin={previewing}
            info={infoOf(previewing)}
            onDismiss={onDismissPreview}
          />
        )}
      </div>
    </div>
  );
}

function Block({ panel, info }: { panel: Panel; info: PluginInfo | undefined }) {
  const layout = useLayout();
  const dispatch = useDispatch();
  const run = useRun();
  const { focusIntentRef, source } = useServices();
  const title = useTitle(panel);
  const Icon = info?.icon ?? PushPin;
  const folded = layout.sidebar.folded.includes(panel.id);
  const collapsed = layout.sidebar.collapsed;
  // Collapsed, the blocks are cropped away and the pane is drawn in the
  // flyout its rail icon opens; the slot stays registered so the pane keeps
  // its mount while nothing is showing it.
  const slot = usePanelSlot<HTMLDivElement>({
    panel,
    hidden: collapsed,
    activates: true,
    sizing: source.loaded(panel.plugin, 'pane')?.fit === 'content' ? 'content' : undefined,
  });
  const focused = layout.focus === panel.id;
  const headerId = `wb-block-${panel.plugin}`;
  const at = layout.sidebar.pinned.indexOf(panel.plugin);
  const { dragRef, dragHandlers, isDragging } = useDragPanel({
    panel: panel.id,
    kind: 'pane',
  });
  // Dropping another navigator on this block inserts it at this pin slot.
  const dragging = useDragging();
  const { dropRef, isOver } = useDropTarget(
    { type: 'pin', index: at },
    dragging?.kind !== 'pane' || dragging?.panel === panel.id,
  );

  return (
    <section
      ref={dropRef}
      className={styles.block}
      aria-labelledby={headerId}
      // The pane's body is drawn in the panel layer, outside this element;
      // `aria-owns` puts it back inside the region its header names, which
      // containing it used to do.
      aria-owns={folded ? undefined : panelDomId(panel.id)}
      data-focused={focused || undefined}
      data-folded={folded || undefined}
      data-over={isOver || undefined}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger className={styles.blockHeader}>
          <button
            type="button"
            id={headerId}
            className={styles.blockToggle}
            aria-expanded={!folded}
            data-panel-tab={panel.id}
            data-dragging={isDragging || undefined}
            ref={dragRef}
            {...dragHandlers}
            onClick={() => {
              focusIntentRef.current = 'user';
              // One operation per click: `focus` on a folded sidebar panel
              // already unfolds it, and dispatching it after `fold` would
              // undo the fold.
              if (folded) dispatch({ type: 'focus', panel: panel.id });
              else dispatch({ type: 'fold', panel: panel.id, folded: true });
            }}
          >
            {/* The accordion header pattern: icon, title, chevron on the
                right. The icon repeats the rail's glyph, tying the block
                to its icon-column entry. */}
            <span className={styles.blockIcon} aria-hidden="true">
              <Icon size={14} />
            </span>
            <span className={styles.blockLabel}>{info?.title ?? title}</span>
            <CaretDown size={12} className={styles.blockChevron} aria-hidden="true" />
          </button>
        </ContextMenu.Trigger>
        <ContextMenu.Popup aria-label={`${title} actions`}>
          <ContextMenu.Item onClick={() => run('workbench:fold', { panel: panel.id })}>
            {folded ? 'Unfold' : 'Fold'}
          </ContextMenu.Item>
          <ContextMenu.Item onClick={() => run('workbench:move-to-main-area', { panel: panel.id })}>
            Move to main area
          </ContextMenu.Item>
          <ContextMenu.Separator />
          {/* A pin position is read after this plugin has been lifted out
              of the list, which is what makes its own index ± 1 the slot
              on the far side of its neighbour. */}
          <ContextMenu.Item
            disabled={at <= 0}
            onClick={() => run('workbench:pin', { plugin: panel.plugin, index: String(at - 1) })}
          >
            Move up
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={at >= layout.sidebar.pinned.length - 1}
            onClick={() => run('workbench:pin', { plugin: panel.plugin, index: String(at + 1) })}
          >
            Move down
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item onClick={() => run('workbench:unpin', { plugin: panel.plugin })}>
            Unpin
          </ContextMenu.Item>
        </ContextMenu.Popup>
      </ContextMenu.Root>
      {!folded && <div ref={slot} className={styles.blockBody} data-panel-slot={panel.id} />}
    </section>
  );
}

// "More": a plain menu of unpinned plugins. Choosing one previews its
// navigator as an ephemeral block at the bottom of the sidebar stack —
// two clicks to look at a plugin without pinning it. The `row` variant is
// the accordion's footer row; the icon variant sits in the collapsed
// column.
export function MoreMenu({
  plugins,
  variant = 'icon',
  onPreview,
}: {
  plugins: PluginInfo[];
  variant?: 'icon' | 'row';
  onPreview: (plugin: PluginId) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          variant === 'row' ? (
            // The header grammar, footer-flavoured: glyph, word, and where
            // a header shows its chevron, the icons of what is inside.
            <button
              type="button"
              className={styles.moreRow}
              aria-label={`More plugins (${plugins.length})`}
            >
              <span className={styles.blockIcon} aria-hidden="true">
                <DotsThree size={14} weight="bold" />
              </span>
              More
              <span className={styles.moreIcons} aria-hidden="true">
                {plugins.slice(0, 5).map((p) => {
                  const Icon = p.icon;
                  return <Icon key={p.id} size={14} />;
                })}
                {plugins.length > 5 && <span>+{plugins.length - 5}</span>}
              </span>
            </button>
          ) : (
            // In the rail: a Toolbar.Button so arrow keys reach it.
            <Toolbar.Button
              render={
                <NavIcon aria-label="More plugins">
                  <DotsThree size={18} weight="bold" aria-hidden="true" />
                </NavIcon>
              }
            />
          )
        }
      />
      <Menu.Popup>
        {plugins.map((p) => {
          const Icon = p.icon;
          return (
            <Menu.Item key={p.id} onClick={() => onPreview(p.id)}>
              <Icon size={14} aria-hidden="true" />
              {p.title}
            </Menu.Item>
          );
        })}
      </Menu.Popup>
    </Menu.Root>
  );
}

// An unpinned plugin's navigator, shown until pinned or dismissed. Not part
// of the layout: a reload forgets it, and the dashed border says so. It
// always sits at the bottom of the stack, wherever it would land: dragging
// it onto a block pins it at that block's position, which is a choice about
// the layout it is about to join, not about where it is being shown now.
function PreviewBlock({
  plugin,
  info,
  onDismiss,
}: {
  plugin: PluginId;
  info: PluginInfo | undefined;
  onDismiss: () => void;
}) {
  const run = useRun();
  const { source } = useServices();
  const panel = makePane(plugin);
  const title = info?.title ?? plugin;
  const Icon = info?.icon ?? PushPin;
  const { dragRef, dragHandlers, isDragging } = useDragPanel({
    panel: panel.id,
    kind: 'pane',
    pins: plugin,
  });
  const slot = usePanelSlot<HTMLDivElement>({
    panel,
    sizing: source.loaded(plugin, 'pane')?.fit === 'content' ? 'content' : undefined,
  });
  return (
    <section
      className={`${styles.block} ${styles.previewBlock}`}
      aria-label={`${title} preview`}
      aria-owns={panelDomId(panel.id)}
      data-dragging={isDragging || undefined}
    >
      <div className={`${styles.blockHeader} ${styles.previewHeader}`}>
        {/* The grip is the icon and title, as on a pinned block, where the
            header button is the drag source. The Pin and Dismiss buttons
            stay clickable beside it. */}
        <span className={styles.previewGrip} ref={dragRef} {...dragHandlers}>
          <span className={styles.blockIcon} aria-hidden="true">
            <Icon size={14} />
          </span>
          <span className={styles.previewTitle}>{title}</span>
        </span>
        <div className={styles.spacer} />
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            void run('workbench:pin', { plugin });
            onDismiss();
          }}
        >
          Pin
        </Button>
        <Button
          size="xs"
          variant="ghost"
          aria-label={`Dismiss ${title} preview`}
          onClick={onDismiss}
        >
          <X size={13} aria-hidden="true" />
        </Button>
      </div>
      <div ref={slot} className={styles.blockBody} data-panel-slot={panel.id} />
    </section>
  );
}

// A pane in a flyout beside the rail: a pinned plugin's, opened from its
// icon while the sidebar is collapsed, or an unpinned one being previewed
// there. One component for both because there is one difference between
// them — the preview is opened from the More menu rather than by its own
// trigger, and offers to pin what it is showing.
function PanePopout({
  panel,
  label,
  name = label,
  icon: Icon,
  trigger,
  anchor,
  open,
  onPin,
  onDismiss,
}: {
  panel: Panel;
  label: string;
  // The flyout's accessible name, when it differs from the header's words.
  name?: string;
  icon?: PluginInfo['icon'];
  trigger?: ReactElement;
  anchor?: RefObject<HTMLElement | null>;
  open?: boolean;
  onPin?: () => void;
  onDismiss?: () => void;
}) {
  const width = useLayout().sidebar.width;
  // A content-fit pane's flyout hugs its content too.
  const fit = useServices().source.loaded(panel.plugin, 'pane')?.fit;
  // Priority over the block's slot: while this is open it is where the pane
  // is drawn, and the block's slot is the hidden one. `anchored` puts the
  // body above the popover it is drawn into.
  const slot = usePanelSlot<HTMLDivElement>({
    panel,
    priority: 1,
    anchored: true,
    sizing: fit === 'content' ? 'content' : undefined,
  });
  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && onDismiss?.()}>
      {trigger && <Popover.Trigger render={trigger} />}
      {/* Beside the rail with its top at the icon: the default bottom-
          centered placement would cover the icons under the clicked one. */}
      <Popover.Popup
        anchor={anchor}
        side="right"
        sideOffset={8}
        align="start"
        alignOffset={6}
        className={styles.popout}
        style={{ width, height: fit === 'content' ? 'auto' : undefined }}
        aria-label={name}
        // The pane's body is drawn over this flyout, not inside it.
        aria-owns={panelDomId(panel.id)}
      >
        <div className={styles.popoutBody}>
          <div className={styles.popoutHeader}>
            {Icon && (
              <span className={styles.blockIcon} aria-hidden="true">
                <Icon size={14} />
              </span>
            )}
            <span className={styles.popoutTitle}>{label}</span>
            {onPin && (
              <>
                <div className={styles.spacer} />
                <Button size="xs" variant="outline" onClick={onPin}>
                  Pin
                </Button>
              </>
            )}
          </div>
          <div ref={slot} className={styles.blockBody} data-panel-slot={panel.id} />
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}
