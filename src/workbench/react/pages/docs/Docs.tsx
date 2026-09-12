import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../../plugins/sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be: the page is the specification and
// the implementation is measured against it.
//
// Shaped like Vite's and Rollup's plugin pages: a working plugin first, then
// one section per module with its example and the few rules that are not
// visible in the code, then the reference with each module's signature and
// schedule. A type appears once, in the reference entry that consumes it.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.narrative}>
            Plugin developers add features to the workbench without changing the workbench itself. A
            plugin is a small Vite project that describes itself in one config file and adds up to
            five things: a page, a sidebar panel, slash commands, answers about what the user is
            typing or has in view, and an assistant that answers free text. The workbench loads
            plugins while it runs, so each one ships on its own schedule from its own server.
          </p>
          <Explainer>
            <p className={styles.para}>
              A plugin is a config object and up to six modules. The config names the plugin and
              declares its slash commands. The workbench's prompt bar is a text input: text
              beginning with <Code>/</Code> runs a slash command; other text, once sent, goes to the
              plugin chosen as the assistant. The modules are <Code>route</Code>, a page;{' '}
              <Code>pane</Code>, a sidebar block (the page's tab and the block are both panels);{' '}
              <Code>commands</Code>, the slash command handlers; <Code>background</Code>, what the
              plugin offers for text as it is typed and what it has about the terms an open page or
              the cart carries; <Code>prompt</Code>, the handler for sent text when the plugin is
              the assistant; and <Code>intent</Code>, what turns the text being typed into the rows
              under the bar when the plugin is chosen for that. <Code>pluginFederation</Code>, a
              Vite plugin from <Code>@kbase/plugin-sdk/vite</Code>, exposes each module over Module
              Federation and writes the config to <Code>manifest.json</Code>. The workbench reads
              the manifest at startup and fetches each module the first time it is needed, except{' '}
              <Code>background</Code> and <Code>intent</Code>, which it fetches at startup.
            </p>
          </Explainer>
        </header>

        <Part id="start" title="Getting started">
          <p className={styles.narrative}>
            The smallest useful plugin is one command that opens one page. These four files are the
            whole thing; the note after them says what each part does once the workbench has loaded
            it.
          </p>
          <File
            name="plugin.config.ts"
            language="typescript"
          >{`import { definePluginManifest } from '@kbase/plugin-sdk/config';

export default definePluginManifest({
  id: 'hello',
  title: 'Hello',
  icon: 'HandWaving',
  commands: [{ name: 'hello', title: 'Say hello', args: [{ name: 'who' }] }],
  launcher: { label: 'Hello', command: 'hello' },
});`}</File>
          <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';
import config from './plugin.config';

export default defineConfig({
  plugins: [
    pluginFederation({
      config,
      route: './src/route.tsx',
      commands: './src/commands.ts',
    }),
    react(),
  ],
});`}</File>
          <File
            name="src/route.tsx"
            language="tsx"
          >{`import { defineRoute, fromReact, usePanel, usePanelTitle } from '@kbase/plugin-sdk';

function Hello() {
  const { path } = usePanel();
  const who = path.slice(1) || 'nobody';
  usePanelTitle(who);
  return <p>Hello, {who}.</p>;
}

export default defineRoute({ ...fromReact(Hello), normalize: (path) => path.toLowerCase() });`}</File>
          <File
            name="src/commands.ts"
            language="typescript"
          >{`import { defineCommands } from '@kbase/plugin-sdk';

export default defineCommands({ hello: ({ who }, { host }) => host.openRoute(\`/\${who ?? ''}\`) });`}</File>
          <File name="" language="bash">{`npm create vite@latest hello -- --template react-ts
cd hello && npm i @kbase/plugin-sdk
npm run dev -- --port 8770`}</File>
          <Explainer>
            <p className={styles.para}>
              With <Code>VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8770</Code> in the
              workbench's <Code>.env.local</Code>, read when its dev server starts, the workbench
              proxies <Code>/services/hello</Code> to that origin and reads{' '}
              <Code>/services/hello/manifest.json</Code> at startup. <Code>launcher</Code> puts a
              Hello card on Browse, the workbench's page listing every plugin; pressing the card
              runs the command. <Code>/hello Alice</Code> runs the <Code>hello</Code> handler, which
              opens the <Code>route</Code> module at <Code>/Alice</Code>:{' '}
              <Code>usePanel().path</Code> is <Code>/Alice</Code> (<Code>openRoute</Code> uses{' '}
              <Code>normalize</Code> only to compare the requested path with each open tab's), and{' '}
              <Code>usePanelTitle</Code> names the tab Alice. <Code>/hello alice</Code> focuses that
              tab instead of opening another.
            </p>
          </Explainer>
        </Part>

        <Part id="manifest" title="The manifest">
          <p className={styles.narrative}>
            The manifest is the plugin's description: its name and icon, the commands it offers, the
            button that opens it. The workbench reads it before loading any code, so everything a
            user can find without opening the plugin comes from here. Names matter here more than
            anywhere else: the id is permanent.
          </p>
          <File
            name="plugin.config.ts"
            language="typescript"
          >{`export default definePluginManifest({
  id: 'function-junction',
  title: 'Function Junction',
  description: 'Per-protein evidence report card.',
  icon: 'Flask',
  color: 'purple',
  commands: [
    {
      name: 'open',
      title: 'Open the evidence dossier',
      args: [{ name: 'id', description: 'a UniProt accession', required: true }],
    },
    { name: 'compare', title: 'Compare with a taxon', args: [{ name: 'taxid' }] },
  ],
  shortcuts: [{ label: 'Dossier', command: 'open', args: { id: 'P0AEX9' } }],
  launcher: { label: 'Function Junction', command: 'open' },
});`}</File>
          <Explainer>
            <p className={styles.para}>
              The config is the object <Code>vite.config.ts</Code> passes as <Code>config</Code>.
              The prompt bar completes each declared command and validates its arguments from the
              declaration; the <Code>commands</Code> module must export a handler with the same
              name. <Code>shortcuts</Code> adds buttons to the sidebar; each runs the command with
              the given arguments.
            </p>
            <p className={styles.para}>
              Text that is not a slash command goes to the intent plugin chosen in Settings, which
              suggests commands for it from every declaration; see Intent below. The bundled one
              reads the title, the descriptions, and <Code>semantics</Code>, a section never shown:{' '}
              <Code>semantics.description</Code> is what the command does in the words a user would
              type for it, synonyms included; <Code>semantics.examples</Code> are phrasings that
              should reach it. An identifier in the text fills the argument whose description says
              it takes that kind of thing, so "dossier for P0AEX9" offers <Code>open</Code> with{' '}
              <Code>id</Code> filled.
            </p>
            <p className={styles.para}>
              <Code>id</Code> appears in URLs and saved layouts and must not change. Command names
              are namespaced by plugin id: <Code>function-junction:open</Code>. The short form{' '}
              <Code>/open</Code> is accepted when it is unambiguous. If another installed plugin
              also declares <Code>open</Code>, the prompt bar rejects <Code>/open</Code> and lists
              the qualified names.
            </p>
          </Explainer>
        </Part>

        <Part id="pages" title="Pages">
          <p className={styles.narrative}>
            A page is the plugin's main view. The workbench shows it in a tab and gives it a path,
            the way a browser gives a site a URL; the plugin decides what each path shows. One rule
            to know: opening a page the user already has focuses that tab rather than adding
            another, and the plugin says which paths count as the same page.
          </p>
          <File name="src/route.tsx" language="tsx">{`function Dossier() {
  const { path, navigate } = usePanel();
  const id = path.slice(1);
  usePanelTitle(id || 'Function Junction');
  usePanelTerms(id ? [\`uniprot:\${id}\`] : []);
  if (!id) return <SearchBox onPick={(picked) => navigate(\`/\${picked}\`)} />;
  return <Report id={id} />;
}

export default defineRoute({
  ...fromReact(Dossier),
  normalize: (path) => path.split('?')[0].toUpperCase(),
});`}</File>
          <Explainer>
            <p className={styles.para}>
              A tab's URL is <Code>/p/&lt;id&gt;&lt;path&gt;</Code>; <Code>usePanel().path</Code> is
              the part after <Code>/p/&lt;id&gt;</Code>, including the query string.{' '}
              <Code>openRoute(path)</Code> focuses an open tab whose path has the same{' '}
              <Code>normalize</Code> result as <Code>path</Code>, and opens a new tab otherwise;
              this route's <Code>normalize</Code> ignores case and the query string.{' '}
              <Code>navigate(path)</Code> changes the tab's path and pushes a history entry.{' '}
              <Code>usePanelTerms(terms)</Code> sets the tab's terms, strings of the form{' '}
              <Code>prefix:value</Code>; while the tab is in front, the workbench asks every other
              plugin's <Code>relate</Code> about them 250 ms after they change, and hands them to
              the intent as the <Code>page</Code> tier. A page that has nothing to say sets none,
              and nothing is asked; the workbench cannot tell that from a page that has not reported
              yet, so the Related pane says only that there is nothing to ask about.
            </p>
          </Explainer>
        </Part>

        <Part id="pane" title="Sidebar pane">
          <p className={styles.narrative}>
            A pane is a compact block in the sidebar, next to other plugins' panes: a recent list, a
            status readout, a toolbar. Users choose which panes are pinned; the plugin only renders.
          </p>
          <File
            name="src/pane.tsx"
            language="tsx"
          >{`export default definePane({ ...fromReact(RecentProteins), fit: 'content' });`}</File>
          <Explainer>
            <p className={styles.para}>
              A plugin with a <Code>pane</Code> module can be pinned to the sidebar from Settings.{' '}
              <Code>fit: 'content'</Code> sizes the block to its content; otherwise it shares the
              sidebar's height with the other pinned panes. <Code>usePanel().path</Code> is{' '}
              <Code>''</Code>. A pane is mounted once wherever it is drawn: with the sidebar
              collapsed its rail icon opens a flyout, and the pane moves into the flyout rather than
              being mounted a second time there. Folding the block unmounts the pane, and unfolding
              mounts it again from scratch.
            </p>
          </Explainer>
        </Part>

        <Part id="background" title="Background">
          <p className={styles.narrative}>
            The background module lets a plugin join in before anything of the plugin's is open. It
            answers two questions on two clocks. While the user types, it says what this plugin
            would do with the text — an accession it recognises, a job id, a dataset it holds — as
            commands the prompt bar can run. Once a page is open or the cart has something in it, it
            says what this plugin has about the terms they carry, as things the user can open or
            keep. The workbench interprets no text itself: what one plugin recognises is pooled and
            passed to the others, so each answers for what the others found. The bundled intent
            plugin's background does nothing but that recognising — it tags identifiers by shape (
            <Code>uniprot:P0AEX9</Code>, <Code>ncbitaxon:562</Code>; a bare number is never tagged).
          </p>
          <File
            name="src/background.ts"
            language="typescript"
          >{`const ACCESSION = /^[A-Z][0-9][A-Z0-9]{3}[0-9]$/i;
const idsIn = (terms) => terms.flatMap((t) => t.match(/^uniprot:(.+)$/)?.[1] ?? []);

export default defineBackground({
  terms: ({ text }) => {
    const q = text.trim().toUpperCase();
    return ACCESSION.test(q) ? [\`uniprot:\${q}\`] : [];
  },

  // Every keystroke, from the pooled terms alone.
  offer: ({ terms }) =>
    idsIn(terms).map((id) => ({
      label: \`Evidence dossier for \${id}\`,
      command: 'open',
      args: { id },
      // Recognised by its shape and not looked up, so it may name nothing.
      match: { term: \`uniprot:\${id}\`, kind: 'identifier' },
    })),

  // 250 ms after the open page's or the cart's terms change. May fetch.
  relate: async ({ terms, signal }) => {
    const rows = await Promise.all(idsIn(terms).map((id) => fetchSummary(id, signal)));
    return rows.filter(Boolean).map((row) => ({
      id: \`function-junction:protein:\${row.id}\`,
      name: row.name,
      subject: row.id,
      summary: row.verdict,
      terms: [\`uniprot:\${row.id}\`, \`ncbitaxon:\${row.taxon}\`],
      // UniProt returned the entry, so this plugin holds the thing.
      answers: [{ term: \`uniprot:\${row.id}\`, kind: 'record' }],
      source: { command: 'open', args: { id: row.id } },
      context: { measuredOver: row.population },
    }));
  },

  // Pushed: the lines as they stand now, and again whenever they change.
  status: (set) => {
    const push = () => set(pending() > 0 ? [{ text: \`\${pending()} lookups running\` }] : []);
    push();
    return lookups.subscribe(push);
  },
});`}</File>
          <Explainer>
            <p className={styles.para}>
              The <Code>background</Code> module's default export has up to four members, each with
              its own schedule. <Code>terms(query)</Code> is called on every keystroke with{' '}
              <Code>query.text</Code> set to the typed text, and returns the terms it recognises in
              it. It is synchronous and does no I/O: the answer is due before the next keystroke.
              Every plugin's terms are pooled, and the pool is what the other two questions are
              asked about.
            </p>
            <p className={styles.para}>
              A term is <Code>prefix:value</Code>, and the prefix is how two plugins that know
              nothing about each other discover they mean the same thing. The rule: where
              Bioregistry has a prefix for the kind of thing, mint the canonical one —{' '}
              <Code>uniprot:</Code>, <Code>ncbitaxon:</Code>, <Code>insdc.gca:</Code>,{' '}
              <Code>kegg.orthology:</Code> — and where it has none, as for names and KBase-local
              ids, mint one of your own and document it. Nothing enforces this: a plugin answers on
              the prefixes it knows and stays silent on the rest, so two spellings of one identifier
              are two terms that nobody connects.
            </p>
            <p className={styles.para}>
              <Code>offer(query)</Code> is called on every keystroke, with <Code>query.text</Code>{' '}
              and <Code>query.terms</Code>, the pool. Answer from the terms alone, without I/O; a
              lookup belongs in <Code>relate</Code>. Each offer carries the term it answers and how
              it matched — <Code>record</Code> if the plugin holds the thing and read the offer out
              of its own inventory, <Code>identifier</Code> if the term is an id in a namespace it
              serves, recognised by shape and not looked up, <Code>name</Code> if words matched
              words — and no score: one plugin's 0.8 says nothing beside another's, and the ordering
              is the intent's job. The offers go to the intent, which decides the rows the bar
              draws. It may be async; <Code>query.signal</Code> aborts when the text changes, an
              answer that arrives after that is dropped, and a late answer asks the intent again.
            </p>
            <p className={styles.para}>
              <Code>relate(query)</Code> is called 250 ms after the front tab's terms or the cart's
              change, with those terms, and never for typed text. It may fetch. It answers with cart
              items, which are shown in the Related pane, where the user opens one, keeps it or
              dismisses it. A plugin is never asked about its own front tab's terms.{' '}
              <Code>answers</Code> names which of the terms it was asked about the item answers, in
              the same <Code>{'{ term, kind }'}</Code> shape an offer's <Code>match</Code> has, and
              the row reads it out: "Function Junction, because this page is about P0AEX9". When a
              pool only grows — the cart gains an item — the plugins are asked about the new terms
              alone and the answers join the rows already on screen.
            </p>
            <p className={styles.para}>
              <Code>status</Code> is a subscription rather than a call: <Code>set</Code> the
              plugin's status-bar lines as it subscribes, and again whenever they change; the
              function it returns ends whatever produces the pushes. A line that waits on a server
              reaches the bar when it lands, because the workbench has no clock of its own for it.
            </p>
            <p className={styles.para}>
              A cart item carries no data. <Code>id</Code> is unique across plugins and derived from
              what the thing is, so adding it twice is the same item and re-adding replaces;{' '}
              <Code>terms</Code> are what other plugins are asked about once the item is in the
              cart; <Code>context</Code> is what an assistant is told and could not infer — units,
              caveats, the population a number was measured over. <Code>source</Code> is the command
              that produces the thing again, and a command rather than a path because whoever ends
              up holding the item — the cart tray, the Related pane, an assistant — runs it through
              the host, and a path can be opened only by the plugin that owns it. The workbench
              stamps the adding plugin's id on <Code>plugin</Code>; a plugin cannot set it, and a
              consumer qualifies <Code>source.command</Code> with it.
            </p>
          </Explainer>
        </Part>

        <Part id="assistant" title="Assistant">
          <p className={styles.narrative}>
            A plugin that can answer free text, whether a chat, a query language or an agent, can be
            chosen as the assistant. Everything the user sends without a leading slash goes to it,
            along with whatever they collected in the cart, and the plugin shows the answer in its
            own page.
          </p>
          <File name="src/prompt.ts" language="typescript">{`export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    koros.steer(slug, text, attachments);
    host.openRoute(\`/\${slug}\`);
  },
  newConversation: ({ host }) => host.openRoute(\`/\${koros.newArc().slug}\`),
  // Pushed: where a message would land now, and again whenever that moves.
  destination: (set) => {
    const push = () => set(koros.destination());
    push();
    return koros.subscribe(push);
  },
});`}</File>
          <Explainer>
            <p className={styles.para}>
              Settings lists every plugin with a <Code>prompt</Code> module, and the user picks the
              assistant from them; there is always one, and a workbench is built with a default.{' '}
              <Code>handle(query, ctx)</Code> is called when the user sends text that does not start
              with <Code>/</Code>. <Code>query.text</Code> is the text, <Code>query.terms</Code> the
              terms found in it, and <Code>ctx.attachments</Code> the cart's items as they stood
              when Enter was pressed. The box and the cart are emptied at that moment, and both come
              back if <Code>handle</Code> rejects. The workbench renders nothing for the response;
              the handler opens the plugin's page with <Code>host.openRoute</Code> and renders it
              there. <Code>newConversation(ctx)</Code> is called when the user picks New in the
              prompt bar's destination menu, which every assistant gets: it opens the page a fresh
              conversation lands on.
            </p>
            <p className={styles.para}>
              <Code>destination(set)</Code> is what the prompt bar shows above the input:{' '}
              <Code>set</Code> a <Code>label</Code>; optionally a <Code>path</Code>, shown as a link
              that opens it with <Code>openRoute</Code>; and optionally <Code>options</Code> and{' '}
              <Code>select</Code>, the options shown as a menu and the chosen key passed back to{' '}
              <Code>select</Code>. Call <Code>set</Code> as you subscribe and again on every move.
              The bar shows the last value it was handed and never asks for one, so your own call is
              what tells it something changed; <Code>set(null)</Code> is no destination, and the bar
              shows New conversation. Choosing another assistant ends the subscription and drops the
              value.
            </p>
          </Explainer>
        </Part>

        <Part id="intent" title="Intent">
          <p className={styles.narrative}>
            A plugin that can turn typed text into command suggestions can be chosen as the intent.
            There is always one, and every row the prompt bar draws under free text comes from it:
            the workbench matches no text itself. Every keystroke that is not a slash command goes
            to it, with the terms the backgrounds found, what the open page and the cart carry, and
            what the plugins offered. The workbench ships one; a plugin with a better reading of
            text replaces it from Settings.
          </p>
          <File name="src/intent.ts" language="typescript">{`let index = buildIndex([], []);

export default defineIntent({
  index: (commands, calls) => {
    index = buildIndex(commands, calls);
  },
  suggest: ({ text, terms, offers }) =>
    rank(index, text, terms, offers).map((r) => ({
      call: { label: r.label, command: r.command, args: r.args },
      plugin: r.plugin,
      detail: r.detail,
      score: r.score,
    })),
});`}</File>
          <Explainer>
            <p className={styles.para}>
              Settings lists every plugin with an <Code>intent</Code> module, and the user picks
              one. <Code>index(commands, calls)</Code> is called once when the module arrives, with
              everything the workbench can be asked to do: every installed plugin's declared
              commands, each with the plugin's id and title, and every call a manifest has already
              filled in — the launcher on Browse, each shortcut button, and one{' '}
              <Code>workbench:show</Code> per plugin with a sidebar pane. A declared command has
              argument holes for the text to fill; a declared call runs as written, so what the text
              decides about it is only whether it is worth showing. Build whatever you rank from
              here, so that a keystroke never sees the catalog.
            </p>
            <p className={styles.para}>
              <Code>suggest(query)</Code> is called on every keystroke. <Code>query.text</Code> is
              the text. <Code>query.terms</Code> is tiered: <Code>typed</Code>, the terms the
              backgrounds found in the text; <Code>page</Code>, the front tab's; <Code>cart</Code>,
              the terms the cart's items carry. A term that arrives by more than one road is listed
              under the first tier that holds it, and the tier is how much the user meant it — no
              plugin is asked about <Code>page</Code> or <Code>cart</Code> on a keystroke, because
              that would put a bigger question to every background on every letter, and the intent
              already ranks the whole catalog. <Code>query.offers</Code> is what the plugins offered
              for the text, each <Code>command</Code> qualified and each carrying the term it
              answers and how it matched.
            </p>
            <p className={styles.para}>
              The answer is the whole list: the intent keeps, moves or drops each offer as it
              judges, alongside its own candidates, and the bar draws what comes back in the order
              it comes back, at most four rows. A suggestion's <Code>plugin</Code> is whose mark the
              row wears where that is not the plugin whose command runs — a pane's row runs{' '}
              <Code>workbench:show</Code> and belongs to the plugin it shows. <Code>suggest</Code>{' '}
              is called again when a slow plugin's offer lands, and when the page or the cart moves
              under text already typed. It may be synchronous or return a promise; the previous rows
              stay until the next answer lands, and <Code>query.signal</Code> aborts when the
              question changes.
            </p>
            <p className={styles.para}>
              The bundled intent scores each candidate by character n-grams over the words its
              declaration gives it, reads an identifier in the text as the kind of thing it is
              rather than as letters, and fills an argument whose description says it takes that
              kind — from a typed term first, then from one the page or the cart merely has around.
              An offer is a candidate like any other, never dropped for its text score and weighted
              by the account the plugin gave for it: a thing read out of an inventory outranks an id
              recognised by shape, which outranks words that matched words.
            </p>
          </Explainer>
        </Part>

        <Part id="commands" title="Commands and the host">
          <p className={styles.narrative}>
            Commands are what the plugin does when a user runs it, from the prompt bar, a sidebar
            button or a suggestion. Each handler gets a host object, the plugin's way to ask the
            workbench for things: open its page, run another plugin's command, show a message, add
            to the cart.
          </p>
          <File name="src/commands.ts" language="typescript">{`export default defineCommands({
  open: ({ id }, { host }) => host.openRoute(\`/\${id}\`),
  compare: async ({ taxid }, { host }) => {
    if (!host.hasCommand('genknown:taxon')) return host.notify('genKnown is not installed.');
    await host.execute('genknown:taxon', { q: taxid });
  },
});`}</File>
          <Explainer>
            <p className={styles.para}>
              A handler receives the arguments, always as strings, and a context holding{' '}
              <Code>host</Code> and <Code>caller</Code>. <Code>host.execute(command, args)</Code>{' '}
              runs a command: <Code>name</Code> runs this plugin's command, <Code>plugin:name</Code>{' '}
              another plugin's. <Code>host.hasCommand(command)</Code> returns whether it is
              registered. <Code>host.notify(text)</Code> shows a toast.{' '}
              <Code>host.cart.add(item)</Code> and <Code>host.cart.remove(id)</Code> change the
              cart; <Code>has</Code> and <Code>count</Code> see only this plugin's items.{' '}
              <Code>useHost()</Code> returns the same object inside a page or pane;{' '}
              <Code>CartButton</Code> renders an Add/Added button for an item.
            </p>
            <p className={styles.para}>
              <Code>ctx.caller</Code> is the id of the plugin whose <Code>execute</Code> ran the
              command, or <Code>'user'</Code> when the workbench's own chrome did: the prompt bar, a
              keybinding, a menu, a shortcut button, a row in a pane. It is a stamp of the
              workbench's and a plugin cannot forge it, so a destructive command can refuse a
              neighbour's call. Read it as "through the workbench's UI" rather than "a person
              pressed something": a button on a plugin's own page that calls <Code>execute</Code>{' '}
              arrives as that plugin.
            </p>
          </Explainer>
        </Part>

        <Part id="reference" title="Reference">
          <Entry id="r-config" name="config" when="Served as manifest.json.">
            <Sig>{`type PluginConfig = Omit<Manifest, 'sdkVersion' | 'modules'>;   // what the author writes

interface Manifest {
  id: string;                    // /^[a-z][a-z0-9-]{1,40}$/
  title: string;
  description?: string;
  icon?: string;                 // a name from the workbench's icon table
  color?: string;                // blue | green | teal | purple | orange | red
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];     // buttons in the sidebar's Shortcuts block
  launcher?: CommandCall;        // the card on Browse

  // written by the build
  sdkVersion: string;            // the SDK this plugin was built against
  modules: Module[];             // 'background' | 'route' | 'pane' | 'commands' | 'prompt' | 'intent'
}

interface SlashCommand {
  name: string;                  // /^[a-z][a-z0-9-]*$/
  title: string;
  description?: string;
  args?: ArgDecl[];              // positional, in this order
  icon?: string;
  semantics?: {                  // what an intent ranks by, never shown
    description: string;         // what the command does, in the words a user would type
    examples?: string[];         // phrasings that should reach it
  };
}

interface ArgDecl {
  name: string;
  description?: string;          // what kind of thing it takes; an intent binds a term by it
  required?: boolean;
}

interface CommandCall {
  label: string;
  command: string;               // "plugin:name", or "name" for this plugin's own
  args?: Record<string, string>;
}

function definePluginManifest(config: PluginConfig): PluginConfig;`}</Sig>
            <p className={styles.para}>
              The workbench accepts a manifest whose <Code>sdkVersion</Code> has the same major
              version as its own and a minor no higher: additions bump the minor, removals the
              major, and the patch never moves the contract. Under 0.x semver gives a minor the
              weight of a major, so until 1.0 only the workbench's own <Code>0.minor</Code> loads.
              Anything else is dropped before any of its code is fetched, and the console says which
              version was served and which is accepted.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(options: {
  config: PluginConfig;          // the manifest, without the two fields the build writes
  background?: string;           // the entry point for each module this plugin ships
  route?: string;
  pane?: string;
  commands?: string;
  prompt?: string;
  intent?: string;
}): Plugin[];`}</Sig>
            <p className={styles.para}>
              Exposes each named entry point as a module and writes the list to{' '}
              <Code>manifest.modules</Code>. A file not named here is not part of the plugin,
              whatever it exports. <Code>react</Code>, <Code>react-dom</Code>, <Code>zod</Code>,{' '}
              <Code>@kbase/plugin-sdk</Code>, <Code>@kbase/design-system</Code>,{' '}
              <Code>@phosphor-icons/react</Code> and <Code>@tanstack/react-router</Code> are taken
              from the workbench and never bundled, whether or not the plugin lists them: these
              remotes run only inside the workbench, so a fallback copy is weight that never loads,
              and a second copy of React or the design system that did load would break hook and
              context identity.
            </p>
          </Entry>

          <Entry id="r-background" name="background" when="Fetched at startup.">
            <Sig>{`type Cleanup = () => void;
type Subscribe<T> = (set: (value: T) => void) => Cleanup;

interface Background {
  terms?: (q: TypedText) => string[];
  offer?: (q: TypedQuery) => Offer[] | Promise<Offer[]>;
  relate?: (q: TermsQuery) => CartItem[] | Promise<CartItem[]>;
  status?: Subscribe<StatusItem[]>;
}

function defineBackground(b: Background): Background;`}</Sig>
            <Export
              id="r-terms"
              name="terms"
              when="Every keystroke, with the text as typed. Synchronous and no I/O: the answer is due before the next keystroke. Every plugin's terms are pooled, and the pool is what offer and relate are asked about."
            >
              <Sig>{`interface TypedText {
  text: string;
}`}</Sig>
            </Export>

            <Export
              id="r-offer"
              name="offer"
              when="Every keystroke, with the text and the pooled terms. Answer from the terms alone. The signal aborts on the next keystroke; an answer that arrives after it is dropped, and one that arrives before it asks the intent again."
            >
              <Sig>{`interface TypedQuery {
  text: string;
  terms: string[];               // every term every plugin found in the text
  signal: AbortSignal;
}

type MatchKind =
  | 'record'                     // the plugin holds the thing and read this offer out of its inventory
  | 'identifier'                 // an id in a namespace it serves, recognised by shape, not looked up
  | 'name';                      // words matched words

interface Match {
  term: string;                  // the term this answers, as it appeared in the query
  kind: MatchKind;
}

interface Offer extends CommandCall {
  match: Match;                  // why it is offered; no score — ordering is the intent's job
}`}</Sig>
              <p className={styles.para}>
                An offer reaches the bar only through the chosen intent, which is handed every
                plugin's offers with each <Code>command</Code> qualified, and answers with the rows
                to draw.
              </p>
            </Export>

            <Export
              id="r-relate"
              name="relate"
              when="250 ms after the front tab's terms or the cart's change, with those terms; never for typed text. May fetch. A plugin is not asked about its own front tab's terms. The signal aborts when the terms change again; after 2 s the pane stops saying it is asking, and a later answer still lands."
            >
              <Sig>{`interface TermsQuery {
  terms: string[];               // what the open page or the cart carries
  signal: AbortSignal;
}

interface CartItem {
  id: string;                    // unique across plugins; derive it from what the thing is
  readonly plugin?: string;      // stamped by the workbench on the way in; a plugin cannot set it
  name: string;
  subject?: string;              // the identifier the item is about
  summary?: string;              // one line
  terms?: string[];              // what other plugins are asked about once the item is in the cart
  answers?: Match[];             // which of the terms asked about this item answers, and how
  source?: { command: string; args?: Record<string, string> };
  context?: Record<string, unknown>;           // what an assistant is told: units, population, caveats
}`}</Sig>
              <p className={styles.para}>
                <Code>terms</Code> is what the item carries onward and <Code>answers</Code> is what
                it was asked about, so an item may answer a term it does not carry and carry terms
                nobody asked for. <Code>answers</Code> is evidence about one question rather than a
                property of the thing: the Related row reads it off, and what the <Code>+</Code>{' '}
                puts in the cart is the item without it. A row the user dismissed stays gone for the
                session, whoever offers it next; a row whose item is already in the cart is shown
                with its button pressed.
              </p>
            </Export>

            <Export
              id="r-status"
              name="status"
              when="Subscribed when the module arrives. Call set with the lines as they stand, and again whenever they change; the workbench shows the last value it was handed. The returned cleanup ends whatever produces the pushes."
            >
              <Sig>{`interface StatusItem {
  text: string;
  action?: CommandCall;          // run when the line is pressed
}`}</Sig>
            </Export>
          </Entry>

          <Entry
            id="r-route"
            name="route"
            when="Fetched when a tab of this plugin first opens. mount runs once per tab."
          >
            <Sig>{`type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;

interface Route {
  mount: Mount;
  // Two paths are the same page when this maps them to one string. The
  // workbench opens and deduplicates on what it returns, and reads no path itself.
  normalize: (path: string) => string;
}

function defineRoute(r: Route): Route;
function fromReact(Component: ComponentType): { mount: Mount };`}</Sig>
            <p className={styles.para}>
              <Code>{'openRoute(path, { duplicate: true })'}</Code> opens a second tab for the same
              page. <Code>{'navigate(path, { replace: true })'}</Code> replaces the history entry
              instead of adding one. A panel is drawn once and mounted once: moving its tab to
              another group, splitting the group, and moving a pane between the sidebar and the main
              area all change where the body is drawn rather than what it sits inside, so{' '}
              <Code>mount</Code> does not run again and an <Code>iframe</Code> inside it does not
              reload.
            </p>
          </Entry>

          <Entry
            id="r-pane"
            name="pane"
            when="Fetched when the pane is first shown. mount runs once, and again after the block is folded and unfolded."
          >
            <Sig>{`interface Pane {
  mount: Mount;
  // The sidebar block hugs its content instead of taking a share of the
  // stack's height — for toolbars and status panels.
  fit?: 'content';
}

function definePane(p: Pane): Pane;`}</Sig>
          </Entry>

          <Entry
            id="r-commands"
            name="commands"
            when="Fetched the first time one of this plugin's commands runs."
          >
            <Sig>{`interface CommandContext {
  host: PluginHost;
  caller: string;                // the plugin whose execute ran it, or 'user' for the workbench's chrome
}

type CommandHandler = (args: Record<string, string>, ctx: CommandContext) => void | Promise<void>;
type Commands = Record<string, CommandHandler>;

function defineCommands(handlers: Commands): Commands;`}</Sig>
            <p className={styles.para}>
              Every argument arrives as a string, whether it was typed in the prompt bar or written
              into a call, a shortcut or a suggestion. A handler that throws produces a toast naming
              the command. The tab appears when <Code>openRoute</Code> is called, so a handler that
              opens a page calls it before its first <Code>await</Code>.
            </p>
          </Entry>

          <Entry
            id="r-prompt"
            name="prompt"
            when="Fetched when Settings names this plugin as the assistant. handle runs when the user sends text that is not a slash command; destination is subscribed as the module arrives."
          >
            <Sig>{`interface Query {
  text?: string;
  terms?: string[];              // the terms the backgrounds found in the text
  signal: AbortSignal;
}

interface Destination {
  label: string;                 // where the next message lands
  path?: string;                 // this plugin's page for it; the bar offers a jump there
  options?: { key: string; label: string }[];   // other places it could land
  select?: (key: string) => void;               // the user picked one
}

interface Prompt {
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  newConversation: (ctx: { host: PluginHost }) => void | Promise<void>;   // New, in the destination menu
  destination?: Subscribe<Destination | null>;
}

function definePrompt(p: Prompt): Prompt;`}</Sig>
            <p className={styles.para}>
              <Code>q.signal</Code> aborts when the user presses Stop or sends another message.
              Choosing another assistant ends the <Code>destination</Code> subscription and drops
              its value, so the previous one is never shown under the new assistant's name.
            </p>
          </Entry>

          <Entry
            id="r-intent"
            name="intent"
            when="Fetched at startup, whether or not Settings names this plugin. index runs once when the module arrives; suggest on every keystroke that is not a slash command, again when a plugin's offer lands late, and again when the page or the cart moves under text already typed."
          >
            <Sig>{`type ContextTier = 'typed' | 'page' | 'cart';       // strongest first
type TieredTerms = Record<ContextTier, string[]>;

type DeclaredCommand = SlashCommand & { plugin: string; pluginTitle: string };

interface DeclaredCall extends CommandCall {
  // The manifest the call came from, whose mark the row wears — not the plugin
  // that declares the command: a pane's call runs the workbench's.
  plugin: string;
  pluginTitle: string;
  description?: string;          // the manifest's own, where the call stands for the whole plugin
}

interface IntentQuery {
  text: string;
  terms: TieredTerms;            // a term is listed under the first tier that holds it
  offers: Offer[];               // each command qualified, each carrying its match
  signal: AbortSignal;
}

interface Suggestion {
  call: CommandCall;             // command qualified as "plugin:name"
  plugin?: string;               // whose mark the row wears, when that is not the command's plugin
  detail?: string;               // the row's caption, in place of the plugin's title
  score: number;                 // higher is closer; rows are shown in the order returned
}

interface Intent {
  index: (commands: DeclaredCommand[], calls: DeclaredCall[]) => void;
  suggest: (q: IntentQuery) => Suggestion[] | Promise<Suggestion[]>;
}

function defineIntent(i: Intent): Intent;`}</Sig>
            <p className={styles.para}>
              At most four rows are drawn, under the row that sends the text to the assistant. With
              no answer there are no rows: the workbench has none of its own.
            </p>
          </Entry>

          <Entry
            id="r-handles"
            name="Handles"
            when="Given to every mount, command handler and prompt handler. In React, read them with the hooks."
          >
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;   // this plugin's page
  execute: (command: string, args?: Record<string, string>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;
  cart: Cart;
}

interface Crumb {
  label: string;
  path?: string;                 // a link that moves the panel there; a crumb naming a level omits it
  icon?: string;                 // a name from the workbench's icon table
}

interface PanelHandle {
  id: string;                    // opaque; stable while the panel lives, whatever its path becomes
  plugin: string;
  kind: 'route' | 'pane';
  path: string;                  // everything under /p/<plugin>, query string included; '' for a pane
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: Crumb[]) => void;
  setTerms: (terms: string[]) => void;
  subscribe: (listener: () => void) => Cleanup;   // path or focus changed
}

interface Cart {
  add: (item: Omit<CartItem, 'plugin'>) => void;   // same id replaces; the workbench stamps the plugin
  remove: (id: string) => void;  // this plugin's items only
  items: () => readonly CartItem[]; // this plugin's items only
  has: (id: string) => boolean;  // this plugin's items only
  count: () => number;           // this plugin's items only
  subscribe: (listener: () => void) => Cleanup;
}

interface CartButtonProps {
  item: CartItem;
  labelled?: boolean;            // the pill with its words showing, for a prominent placement
  className?: string;
  disabled?: boolean;
}

// React
function useHost(): PluginHost;
function usePanel(): PanelHandle;         // re-renders on path and focus
function useCart(): Cart;                 // re-renders on change
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: Crumb[]): void;
function usePanelTerms(terms: string[]): void;
function CartButton(props: CartButtonProps): JSX.Element;   // the design system's, bound to this plugin's cart`}</Sig>
            <p className={styles.para}>
              <Code>setCrumbs</Code> draws a trail above the panel; a crumb with a <Code>path</Code>{' '}
              is a link that moves the panel there. A plugin reads the cart slice it wrote and
              nothing else: what the user has collected from elsewhere is their business and the
              assistant's.
            </p>
            <p className={styles.para}>
              Three things can go wrong inside a panel, and each has its own recovery, so read which
              button the alert offers. A module that never arrived — an unreachable remote, a bad
              bundle, a missing default export — is an alert naming the plugin and saying it could
              not be loaded, and <strong>Try again</strong> fetches it again in place; nothing of
              the plugin has run. A component that throws under the fence <Code>fromReact</Code>{' '}
              puts around it reads "This panel crashed", and <strong>Try again</strong> draws the
              component again inside the React root your <Code>mount</Code> already made, so the
              mount and everything it holds outside the component survive. Anything that throws
              outside that fence — a <Code>mount</Code> of your own, or a throw React could not
              route to it — reaches the workbench's own boundary around the whole panel, which reads
              the same and offers <strong>Restart panel</strong>: clearing it runs your{' '}
              <Code>mount</Code> again on a fresh element, from the module already in memory. In all
              three the thrown message sits behind the alert's Details rather than on its face.
            </p>
          </Entry>
        </Part>

        <Part id="deploying" title="Deploying">
          <p className={styles.narrative}>
            In production a plugin is a static bundle served beside its own backend. The workbench
            needs three paths to reach it, and a registry that lists which plugins exist.
          </p>
          <File name="" language="text">{`/services/<id>/manifest.json     the manifest
/services/<id>/plugin/…          everything in dist/
/plugin-registry/plugins         the list of manifests`}</File>
          <Explainer>
            <p className={styles.para}>
              The plugin's service serves the first two paths. A registry answers the third with an
              array of manifests. The workbench fetches all three from its own origin; a deployment
              routes them to the plugin services and the registry in front of the workbench image.
              Without a registry the workbench runs its bundled plugins only. In development,{' '}
              <Code>VITE_DEV_SERVICE_PROXY</Code> proxies each{' '}
              <Code>&lt;prefix&gt;=&lt;origin&gt;</Code> pair and serves as the registry for them.
            </p>
          </Explainer>
        </Part>

        <Part id="errors" title="Troubleshooting">
          <p className={styles.narrative}>Symptoms, and what each one means.</p>
          <div className={styles.trouble}>
            <Symptom name="The plugin does not appear">
              Settings lists every installed plugin. If it is missing there, open{' '}
              <Code>/plugin-registry/plugins</Code> from the workbench's origin: the manifest is
              either absent, because the registry or dev proxy cannot reach the service, or present
              but invalid, in which case the console names the field. If it is in Settings but not
              on Browse, it has no <Code>launcher</Code>.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the panel's tree, for example in a portal. The handle
              exists only inside that tree; a component rendered elsewhere receives it as a prop.
            </Symptom>
            <Symptom name="A command completes, then fails">
              The toast says why: <Code>vite.config.ts</Code> does not name <Code>commands</Code>,
              the module has no handler for that name, or the handler threw.
            </Symptom>
            <Symptom name="Nothing this plugin offers ever appears">
              Check, in order of likelihood, that <Code>background</Code> is named in{' '}
              <Code>vite.config.ts</Code>, that the console does not report it failing to load, and
              that <Code>terms</Code> mints a term <Code>offer</Code> or <Code>relate</Code> reads
              back — the pool carries every plugin's terms, so a prefix a neighbour minted is not
              one you match unless you both chose the canonical one. Beyond that: an offer reaches
              the bar only through the chosen intent, which draws four rows and may rank yours below
              them; a plugin is never asked about its own front tab's terms; and a row dismissed in
              Related stays gone for the rest of the session.
            </Symptom>
            <Symptom name="The panel shows an alert instead of the plugin">
              Which recovery it offers says what happened. "could not be loaded" with Try again is
              the module never arriving: "exposed nothing at ./route" means the file has no default
              export, and pressing the button fetches it again. "This panel crashed" is the plugin's
              own code throwing while rendering; the message is behind Details. Try again there
              redraws the component, and Restart panel runs <Code>mount</Code> again.
            </Symptom>
          </div>
        </Part>
      </article>
    </div>
  );
}

const SECTIONS: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: 'start', label: 'Getting started' },
  { id: 'manifest', label: 'The manifest' },
  { id: 'pages', label: 'Pages' },
  { id: 'pane', label: 'Sidebar pane' },
  { id: 'background', label: 'Background' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'intent', label: 'Intent' },
  { id: 'commands', label: 'Commands and the host' },
  {
    id: 'reference',
    label: 'Reference',
    children: [
      { id: 'r-config', label: 'config' },
      { id: 'r-vite', label: 'vite.config.ts' },
      { id: 'r-background', label: 'background' },
      { id: 'r-route', label: 'route' },
      { id: 'r-pane', label: 'pane' },
      { id: 'r-commands', label: 'commands' },
      { id: 'r-prompt', label: 'prompt' },
      { id: 'r-intent', label: 'intent' },
      { id: 'r-handles', label: 'Handles' },
    ],
  },
  { id: 'deploying', label: 'Deploying' },
  { id: 'errors', label: 'Troubleshooting' },
];

// The panel scrolls, not the window, so the rail moves the panel's own
// scroller rather than setting a hash the router would treat as navigation.
function Rail() {
  const go = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  return (
    <nav className={styles.rail} aria-label="On this page">
      <ul className={styles.railList}>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button type="button" className={styles.railTop} onClick={go(s.id)}>
              {s.label}
            </button>
            {s.children && (
              <ul className={styles.railList}>
                {s.children.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={styles.railItem} onClick={go(c.id)}>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.part} id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="h4">
        {title}
      </h2>
      {children}
    </section>
  );
}

// One module of the contract: its name, when the host reaches it, the types it
// consumes, and the constraints as prose.
function Entry({
  id,
  name,
  when,
  children,
}: {
  id: string;
  name: string;
  when: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.entry} id={id} aria-labelledby={`${id}-h`}>
      <div className={styles.entryHead}>
        <h3 id={`${id}-h`} className={styles.entryName}>
          {name}
        </h3>
        <p className={styles.when}>{when}</p>
      </div>
      {children}
    </section>
  );
}

// One member of a module whose default export holds several, each with its own schedule.
function Export({
  id,
  name,
  when,
  children,
}: {
  id: string;
  name: string;
  when: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.export} id={id} aria-labelledby={`${id}-h`}>
      <div className={styles.entryHead}>
        <h4 id={`${id}-h`} className={styles.exportName}>
          {name}
        </h4>
        <p className={styles.when}>{when}</p>
      </div>
      {children}
    </section>
  );
}

function Sig({ children }: { children: string }) {
  return <CodeBlock collapsible={false} language="typescript" code={children} />;
}

function File({ name, language, children }: { name: string; language: string; children: string }) {
  return (
    <figure className={styles.file}>
      {name && <figcaption className={styles.fileName}>{name}</figcaption>}
      <CodeBlock collapsible={false} language={language} code={children} />
    </figure>
  );
}

// The precise rules of a section, read after its narrative has set them up.
function Explainer({ children }: { children: ReactNode }) {
  return <div className={styles.explainer}>{children}</div>;
}

function Symptom({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className={styles.symptom}>
      <h4 className={styles.symptomName}>{name}</h4>
      <p className={styles.para}>{children}</p>
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className={styles.inline}>{children}</code>;
}
