import { defineIntent } from '@kbase/plugin-sdk';
import type { CommandIndex } from './rank';
import { buildCommandIndex, rankCommands } from './rank';
import { tagText } from './tag';

// The bundled intent: everything the workbench can be asked to do — every
// declared command, every launcher, shortcut button and pane — ranked against
// the text by character n-grams over the words that describe it, with
// arguments filled from the identifiers the text carries and from the ones
// the open page and the cart carry. The catalog is indexed once; a keystroke
// costs one short vector and a dot product per candidate.
let index: CommandIndex | null = null;

export default defineIntent({
  index: (commands, calls) => {
    index = buildCommandIndex(commands, calls);
  },
  suggest: ({ text, terms, offers }) => {
    if (!index || !text) return [];
    // A plugin's offer, and a call a manifest wrote, are worded by their
    // author. A row of this plugin's own leads with what it acts on and says
    // what it does in the caption: the identifier is what the reader is
    // looking for, and a title written for the command list is long.
    return rankCommands(index, text, tagText(text), terms, offers).map((r) => {
      const filled = Object.values(r.args).map(String);
      if (r.label !== undefined) {
        return {
          call: { label: r.label, command: r.command, args: r.args },
          plugin: r.plugin,
          detail: r.detail,
          score: r.score,
        };
      }
      return {
        call: {
          label: filled.length ? filled.join(', ') : r.title,
          command: r.command,
          args: r.args,
        },
        plugin: r.plugin,
        detail: filled.length ? `${r.title} · ${r.pluginTitle}` : undefined,
        score: r.score,
      };
    });
  },
});
