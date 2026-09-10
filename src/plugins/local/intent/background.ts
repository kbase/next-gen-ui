import { defineBackground } from '@kbase/plugin-sdk';
import { tagText } from './tag';

// The identifiers in the text, by shape alone, under the prefix Bioregistry
// gives them: `P0AEX9` anywhere in a sentence is `uniprot:P0AEX9`. Every
// other plugin's recommend sees them the way it sees a term any plugin
// minted; nothing here knows which plugin will take one.
export default defineBackground({
  terms: ({ text }) => (text ? tagText(text).map((t) => t.term) : []),
});
