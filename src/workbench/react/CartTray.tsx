import { useState, useSyncExternalStore } from 'react';
import { ShoppingCartSimple, X } from '@phosphor-icons/react';
import { AlertDialog, Button, CodeBlock, Dialog, Tooltip } from '@kbase/design-system';
import { qualifyCommand } from '../../plugins/sdk';
import type { CartItem } from '../core';
import { iconFor } from '../host/icons';
import { useRun, useServices } from './context';
import styles from './Workbench.module.css';

// The cart: what the user has added, sitting where it will be sent from.
//
// Sits inside the composer, the way a photo does in a chat client, and for the
// same reason: the cart goes with the next message, so it belongs where the
// message is written and not in a panel that has to be gone and found.
//
// One tile per item, following what a composer does with a file: a preview, the
// name on hover, and a remove control in the corner (Slack, assistant-ui,
// Claude all land here). What differs is the preview. Those are pictures, and
// the picture is the identification, which is what lets the name move to hover.
//
// Ours are not pictures. A tile with nothing in it is a row of identical grey
// squares — the failure the Claude teardown names, where attachments without
// type and size "are harder to scan when you attach multiple files." But an item
// carries something a photo does not: the subject it is about and the figure it
// was added for. `P0AEX9` over `74% core`. That goes in the preview slot, and it
// identifies the tile the way a thumbnail identifies a photo.
//
// The row scrolls sideways rather than wrapping. A cart that grows downward
// eats the message the user is writing, and it does so worst exactly
// when they have collected the most — so the composer's height is fixed and the
// overflow goes where a photo strip's does.

export function CartTray() {
  const { cart, source } = useServices();
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);
  const [preview, setPreview] = useState<CartItem | null>(null);
  const items = cart.items();
  if (items.length === 0) return null;

  // Follows the store rather than the click: removing the previewed item from
  // under the dialog should close it, not leave a dialog onto nothing.
  const shown = preview && items.find((i) => i.id === preview.id) ? preview : null;

  return (
    <Tooltip.Provider delay={300}>
      {/* The cart names itself and carries its own controls. Hung off the end
          of the tile row it floated against nothing; put in the composer's
          footer it read as part of the destination line, which is about where
          the message goes rather than what goes with it. */}
      <p className={styles.cartCaption}>
        {/* The icon says which region this is; the number says how much is in
            it. The word `Cart` beside a cart is the caption reading itself
            aloud. */}
        <span className={styles.cartMeasure}>
          <ShoppingCartSimple size={14} aria-hidden="true" />
          {items.length}
          <span className={styles.srOnly}>{`in the cart`}</span>
        </span>
        <AlertDialog.Root>
          {/* The word and the glyph: a trash can alone had to be guessed at,
              the word alone in a bordered box outweighed the tiles it acts on.
              The verb is the one on every tile's own control — a cart has one
              way of taking things out of it, so it has one word for doing so.
              `quiet` for the weight, since this sits on a caption row. */}
          <AlertDialog.Trigger
            render={<Button variant="ghost" size="xs" quiet className={styles.cartClear} />}
          >
            Remove all
            <X size={11} weight="bold" aria-hidden="true" />
          </AlertDialog.Trigger>
          <AlertDialog.Popup>
            <AlertDialog.Title>{`Remove ${countOf(items.length)} from the cart?`}</AlertDialog.Title>
            <div className={styles.cartPreviewActions}>
              <AlertDialog.Close render={<Button variant="outline" size="sm" />}>
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                render={<Button variant="danger" size="sm" />}
                onClick={() => {
                  setPreview(null);
                  cart.clear();
                }}
              >
                {`Remove ${countOf(items.length)}`}
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Root>
      </p>

      <ul className={styles.cartRow} aria-label={`Cart, ${items.length} items`}>
        {items.map((item) => {
          // Always the plugin's own logo, never the item's. In a tray of six
          // things from three tools, which tool something came from is the
          // fact that groups them; a per-item glyph would make six unrelated
          // marks and say nothing a reader could use.
          const manifest = source.manifest(item.plugin);
          const Mark = iconFor(manifest?.icon, manifest?.color);
          return (
            <li key={item.id} className={styles.cartItem}>
              {/* The tile opens the item. A summary is a glance; the payload
                    an assistant will read is the thing worth checking before
                    sending, and until now there was no way to see it. */}
              <button type="button" className={styles.cartOpen} onClick={() => setPreview(item)}>
                {/* The square is the thumbnail slot a file attachment has,
                    filled with the plugin's mark. It is what a reader sorts a
                    strip of these by, and it carries the item's full name. */}
                <Tooltip.Root>
                  <Tooltip.Trigger render={<span className={styles.cartMark} />}>
                    <Mark size={16} weight="fill" aria-hidden="true" />
                  </Tooltip.Trigger>
                  <Tooltip.Popup side="top">
                    {item.name}
                    {manifest?.title ? ` — ${manifest.title}` : ''}
                  </Tooltip.Popup>
                </Tooltip.Root>
                <span className={styles.cartText}>
                  <span className={styles.cartSubject}>{item.subject ?? item.name}</span>
                  {item.summary && <span className={styles.cartSummary}>{item.summary}</span>}
                </span>
                <span className={styles.srOnly}>{`Open ${item.name}`}</span>
              </button>
              <button
                type="button"
                className={styles.cartRemove}
                aria-label={`Remove ${item.name} from the cart`}
                onClick={() => cart.remove(item.id)}
              >
                <X size={11} weight="bold" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog.Root open={shown != null} onOpenChange={(open) => !open && setPreview(null)}>
        <Dialog.Popup className={styles.cartPreview}>
          {shown && <Preview item={shown} plugin={source.manifest(shown.plugin)?.title} />}
          <div className={styles.cartPreviewFoot}>
            {shown && (
              <Button
                variant="ghost"
                size="sm"
                className={styles.cartPreviewRemove}
                onClick={() => {
                  cart.remove(shown.id);
                  setPreview(null);
                }}
              >
                Remove from cart
              </Button>
            )}
            <Dialog.Close render={<Button variant="primary" size="sm" />}>Close</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Root>
    </Tooltip.Provider>
  );
}

// Everything the item is carrying, in the order a reader needs it: what it is,
// what an assistant would be told about it, and how to get back to it.
function Preview({ item, plugin }: { item: CartItem; plugin?: string }) {
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  const run = useRun();
  const source = item.source;
  return (
    <>
      <Dialog.Title className={styles.cartPreviewTitle}>{item.name}</Dialog.Title>
      <Dialog.Description className={styles.cartPreviewMeta}>
        {[item.subject, plugin].filter(Boolean).join(' · ')}
      </Dialog.Description>
      {item.summary && <p className={styles.cartPreviewSummary}>{item.summary}</p>}

      {item.context != null && (
        <section className={styles.cartPreviewPart}>
          <h3 className={styles.cartPreviewHeading}>Context</h3>
          <CodeBlock
            language="json"
            collapsible={false}
            className={styles.cartPreviewJson}
            code={json(item.context)}
          />
        </section>
      )}

      {source && 'path' in source && (
        <p className={styles.cartPreviewSource}>
          Reopens at <code className={styles.cartPreviewParam}>{source.path}</code>
        </p>
      )}
      {source && 'command' in source && (
        <p className={styles.cartPreviewSource}>
          <Button
            variant="outline"
            size="xs"
            onClick={() => void run(qualifyCommand(source.command, item.plugin), source.args)}
          >
            {`Run /${source.command}`}
          </Button>
        </p>
      )}
    </>
  );
}

function countOf(n: number): string {
  return n === 1 ? '1 item' : `${n} items`;
}

// On the disclosure label, so a reader knows whether opening it costs them the
// screen before they press it.
