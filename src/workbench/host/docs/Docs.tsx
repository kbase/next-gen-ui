import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { usePanelTitle } from '../../../plugins/sdk';
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
            five things: a page, a sidebar panel, slash commands, suggestions while the user types,
            and an assistant that answers free text. The workbench loads plugins while it runs, so
            each one ships on its own schedule from its own server.
          </p>
          <Explainer>
            <p className={styles.para}>
              A plugin is a config object and up to six modules. The config names the plugin and
              declares its slash commands. The workbench's prompt bar is a text input: text
              beginning with <Code>/</Code> runs a slash command; other text, once sent, goes to the
              plugin chosen as the assistant. The modules are <Code>route</Code>, a page;{' '}
              <Code>pane</Code>, a sidebar block (the page's tab and the block are both panels);{' '}
              <Code>commands</Code>, the slash command handlers; <Code>background</Code>, functions
              called as the user types in the prompt bar, to suggest commands and data related to
              the text; <Code>prompt</Code>, the handler for sent text when the plugin is the
              assistant; and <Code>intent</Code>, what suggests commands for the text being typed
              when the plugin is chosen for that. <Code>pluginFederation</Code>, a Vite plugin from{' '}
              <Code>@kbase/plugin-sdk/vite</Code>, exposes each module over Module Federation and
              writes the config to <Code>manifest.json</Code>. The workbench reads the manifest at
              startup and loads each module the first time it is needed, except{' '}
              <Code>background</Code>, which it loads at startup.
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
    { name: 'open', title: 'Open the evidence dossier', args: [{ name: 'id', required: true }] },
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
              <Code>q</Code> filled.
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
              <Code>prefix:value</Code>; while the tab is in front, the workbench passes them to
              every other plugin's <Code>recommend</Code> function, described under Background.
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
              <Code>''</Code>. Folding the block unmounts the pane; with the sidebar collapsed, its
              icon opens a popover holding a second mount, alongside the block's.
            </p>
          </Explainer>
        </Part>

        <Part id="background" title="Background">
          <p className={styles.narrative}>
            The background module lets a plugin join in while the user is typing, before anything of
            the plugin's is open. It can recognise something it understands in the text, an
            accession or a job id, and offer a command or a piece of data for it. The workbench does
            not interpret text itself; it passes what plugins recognised to the other plugins, so
            each can react to what the others found. The bundled intent plugin's background is one
            such plugin: it tags identifiers by shape under the prefix Bioregistry gives them (
            <Code>uniprot:P0AEX9</Code>, <Code>ncbitaxon:562</Code>; a bare number is never tagged).
          </p>
          <File
            name="src/background.ts"
            language="typescript"
          >{`const ACCESSION = /^[A-Z][0-9][A-Z0-9]{3}[0-9]$/i;
const idsIn = (terms) => (terms ?? []).flatMap((t) => t.match(/^uniprot:(.+)$/)?.[1] ?? []);

export default defineBackground({
  terms: ({ text }) => {
    const q = text?.trim().toUpperCase() ?? '';
    return ACCESSION.test(q) ? [\`uniprot:\${q}\`] : [];
  },

  recommend: {
    commands: ({ terms }) =>
      idsIn(terms).map((id) => ({ label: \`Evidence dossier for \${id}\`, command: 'open', args: { id } })),

    cartItems: async ({ terms, signal }) => {
      const rows = await Promise.all(idsIn(terms).map((id) => fetchSummary(id, signal)));
      return rows.map((row) => ({
        id: \`function-junction:protein:\${row.id}\`,
        name: row.name,
        subject: row.id,
        summary: row.verdict,
        terms: [\`uniprot:\${row.id}\`, \`taxon:\${row.taxon}\`],
        source: { path: \`/\${row.id}\` },
        context: { measuredOver: row.population },
      }));
    },
  },

  status: () =>
    pending() > 0 ? [{ text: \`\${pending()} lookups running\`, action: { label: 'Show', command: 'open' } }] : [],
});`}</File>
          <Explainer>
            <p className={styles.para}>
              The <Code>background</Code> module's default export has up to three members.{' '}
              <Code>terms(query)</Code> is called on every keystroke with <Code>query.text</Code>{' '}
              set to the typed text, and returns the terms found in it, synchronously.
            </p>
            <p className={styles.para}>
              <Code>recommend.commands(query)</Code> is called on every keystroke, with{' '}
              <Code>query.terms</Code> set to every term returned by every plugin: answer from the
              terms alone, without I/O. What it returns goes to the intent plugin, which orders it
              with its own candidates; the prompt bar shows the offers as the plugin made them only
              when no intent is chosen or the intent answers nothing. It may be async;{' '}
              <Code>query.signal</Code> aborts when the text changes, a result returned after that
              is discarded, and a late answer asks the intent again.{' '}
              <Code>recommend.cartItems</Code> is not called for typed text. Both functions are
              called 250 ms after the front tab's terms change, with those terms, and 250 ms after
              the cart changes, with its items' terms; a plugin is not called with its own tab's
              terms. Returned cart items are shown in Related, a sidebar pane, where the user can
              open one or add it to the cart, the list of items sent with the next message.
            </p>
            <p className={styles.para}>
              <Code>status()</Code> is called at startup and after every command, and returns lines
              for the status bar.
            </p>
            <p className={styles.para}>
              A cart item carries no data: <Code>context</Code> is what an assistant is told about
              it (units, caveats, the population a number was measured over), and a consumer fetches
              the thing itself from where it lives. <Code>terms</Code> are passed to other plugins'{' '}
              <Code>recommend</Code> once the item is in the cart. <Code>source</Code> is the path{' '}
              <Code>openRoute</Code> uses to open it, or a command that produces it again.{' '}
              <Code>id</Code> must be unique across plugins; adding an item with an existing id
              replaces it.
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
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});`}</File>
          <Explainer>
            <p className={styles.para}>
              Settings lists every plugin with a <Code>prompt</Code> module, and the user picks the
              assistant from them. <Code>handle(query, ctx)</Code> is called when the user sends
              text that does not start with <Code>/</Code>. <Code>query.text</Code> is the text,{' '}
              <Code>query.terms</Code> the terms found in it, and <Code>ctx.attachments</Code> the
              cart's items. The cart is emptied when <Code>handle</Code> is called. The workbench
              renders nothing for the response; the handler opens the plugin's page with{' '}
              <Code>host.openRoute</Code> and renders it there. <Code>newConversation(ctx)</Code> is
              called when the user picks New in the prompt bar's destination menu, which every
              assistant gets: it opens the page a fresh conversation lands on.
            </p>
            <p className={styles.para}>
              <Code>destination.current()</Code> returns what the prompt bar shows above the input:
              a <Code>label</Code>; optionally a <Code>path</Code>, shown as a link that opens it
              with <Code>openRoute</Code>; and optionally <Code>options</Code> and{' '}
              <Code>select</Code>, the options shown as a menu and the chosen key passed to{' '}
              <Code>select</Code>. The bar calls it again after each <Code>subscribe</Code>{' '}
              notification.
            </p>
          </Explainer>
        </Part>

        <Part id="intent" title="Intent">
          <p className={styles.narrative}>
            A plugin that can turn typed text into command suggestions can be chosen as the intent.
            Every keystroke in the prompt bar that is not a slash command goes to it, with the terms
            every background found, and what it suggests is shown as rows under the plugins' own
            offers. The workbench ships one; a plugin with a better reading of text replaces it from
            Settings.
          </p>
          <File name="src/intent.ts" language="typescript">{`let index = buildIndex([]);

export default defineIntent({
  index: (commands) => {
    index = buildIndex(commands);
  },
  suggest: ({ text, terms }) =>
    rank(index, text, terms).map((r) => ({
      call: { label: r.title, command: \`\${r.plugin}:\${r.name}\`, args: r.args },
      score: r.score,
    })),
});`}</File>
          <Explainer>
            <p className={styles.para}>
              Settings lists every plugin with an <Code>intent</Code> module, and the user picks
              one. <Code>index(commands)</Code> is called once when the module arrives, with every
              installed plugin's commands as their manifests declare them, each with the plugin's id
              and title; whatever the plugin builds from them is built here, so that a keystroke
              never sees the catalog. <Code>suggest(query)</Code> is called on every keystroke with{' '}
              <Code>query.text</Code>, <Code>query.terms</Code>, the terms every background found,
              and <Code>query.offers</Code>, the commands plugins offered for those terms, each{' '}
              <Code>command</Code> qualified. The answer is the whole list: the intent keeps, moves
              or leaves out each offer as it judges, alongside its own candidates, and the workbench
              shows the offers as the plugins made them only when there is no answer. When an offer
              arrives after the keystroke, <Code>suggest</Code> is called again with it. It may be
              synchronous or return a promise; what arrives is shown, the previous suggestions stay
              until it does, and <Code>query.signal</Code> aborts when the text changes. Each
              suggestion is a command call with its <Code>command</Code> qualified as{' '}
              <Code>plugin:name</Code> and a score; rows are shown in the order returned, at most
              four.
            </p>
            <p className={styles.para}>
              The bundled intent ranks by character n-grams over each declaration, reads an
              identifier in the text as the kind of thing it is, and fills an argument whose
              description says it takes that kind. An offer is a candidate with a small lift, shown
              in the plugin's own words. The lift reads letters, not context: an offer for an
              identifier that is a coincidence in the sentence is ordered low, not left out. Its
              background is what tags the identifiers.
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
              A handler receives the arguments and a context holding <Code>host</Code>.{' '}
              <Code>host.execute(command, args)</Code> runs a command: <Code>name</Code> runs this
              plugin's command, <Code>plugin:name</Code> another plugin's.{' '}
              <Code>host.hasCommand(command)</Code> returns whether it is registered.{' '}
              <Code>host.notify(text)</Code> shows a toast. <Code>host.cart.add(item)</Code> and{' '}
              <Code>host.cart.remove(id)</Code> change the cart; <Code>has</Code> and{' '}
              <Code>count</Code> see only this plugin's items. <Code>useHost()</Code> returns the
              same object inside a page or pane; <Code>CartButton</Code> renders an Add/Added button
              for an item.
            </p>
          </Explainer>
        </Part>

        <Part id="reference" title="Reference">
          <Entry id="r-config" name="config" when="Served as manifest.json.">
            <Sig>{`interface Manifest {
  id: string;                    // /^[a-z][a-z0-9-]{1,40}$/
  title: string;
  description?: string;
  icon?: string;                 // a name from the workbench's icon table
  color?: string;                // blue | green | teal | purple | orange | red
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];
  launcher?: CommandCall;

  // written by the build
  sdkVersion: string;            // the SDK's package version
  modules: ('background' | 'route' | 'pane' | 'commands' | 'prompt' | 'intent')[];
}

interface SlashCommand {
  name: string;                  // /^[a-z][a-z0-9-]*$/
  title: string;
  description?: string;
  args?: { name: string; description?: string; required?: boolean }[];   // positional, in this order
  icon?: string;
  semantics?: {                  // ranked by in the prompt bar, never shown
    description: string;         // what the command does, in the words a user would type
    examples?: string[];         // phrasings that should reach it
  };
}

interface CommandCall {
  label: string;
  command: string;               // "plugin:name", or "name" for this plugin's own
  args?: Record<string, string | number>;
}

function definePluginManifest(m: Manifest): Manifest;`}</Sig>
            <p className={styles.para}>
              The workbench rejects a manifest whose <Code>sdkVersion</Code> it does not accept and
              logs the reason.
            </p>
          </Entry>

          <Entry id="r-vite" name="vite.config.ts" when="Read by the build.">
            <Sig>{`function pluginFederation(options: {
  config: Manifest;              // the manifest, without the two fields the build writes
  background?: string;           // entry point for each module
  route?: string;
  pane?: string;
  commands?: string;
  prompt?: string;
}): VitePlugin[];`}</Sig>
            <p className={styles.para}>
              Exposes each named entry point as a module and writes the list to{' '}
              <Code>manifest.modules</Code>. Shares <Code>react</Code>, <Code>react-dom</Code>,{' '}
              <Code>zod</Code>, <Code>@kbase/plugin-sdk</Code>, <Code>@kbase/design-system</Code>,{' '}
              <Code>@phosphor-icons/react</Code> and <Code>@tanstack/react-router</Code> with the
              workbench, for each one listed in the plugin's <Code>package.json</Code>.
            </p>
          </Entry>

          <Entry id="r-background" name="background" when="Loaded at startup.">
            <Sig>{`function defineBackground(b: {
  terms?: (q: Query) => string[];
  recommend?: {
    commands?: (q: Query) => CommandCall[] | Promise<CommandCall[]>;
    cartItems?: (q: Query) => CartItem[] | Promise<CartItem[]>;
  };
  status?: () => StatusItem[];
}): Background;`}</Sig>
            <Export
              id="r-terms"
              name="terms"
              when="Called on every keystroke with the text, then once more with all terms found so far. Also called with the open page's terms and the cart's terms when they change. Synchronous."
            >
              <Sig>{`interface Query {
  text?: string;                 // the typed text, on the first call
  terms?: string[];              // the terms found so far, on the second
  signal: AbortSignal;
}`}</Sig>
            </Export>

            <Export
              id="r-recommend"
              name="recommend"
              when="commands: on every keystroke, with the typed text's terms, and 250 ms after the open page's terms or the cart last changed. cartItems: 250 ms after the page's terms or the cart changed, never for typed text. Each plugin's answer replaces its own section as it arrives; the previous answer stays, dimmed, until then. The signal aborts when the source changes again. After 2 s the pane stops saying it is asking, but a later answer still lands. A page or cart pool that only grew is asked about the new terms, and the answers join the sections already shown."
            >
              <Sig>{`interface CartItem {
  id: string;                    // unique across plugins; prefix with the plugin id
  name: string;
  subject?: string;              // the identifier the item is about
  summary?: string;              // one line
  terms?: string[];              // what other plugins are asked about once the item is in the cart
  source?: { path: string } | { command: string; args?: Record<string, string | number> };
  context?: Record<string, unknown>;           // what an assistant is told: units, population, caveats
}`}</Sig>
              <p className={styles.para}>
                Commands are shown for the typed text only, at most four. Cart items already in the
                cart, or dismissed from Related, are not shown.
              </p>
            </Export>

            <Export
              id="r-status"
              name="status"
              when="Called at startup, after any module loads, and after every command. The result is shown until the next call."
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
            when="Loaded when a tab of this plugin first opens. mount is called once per tab."
          >
            <Sig>{`type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;
type Cleanup = () => void;

function defineRoute(r: { mount: Mount; normalize: (path: string) => string }): Route;
function fromReact(Component: ComponentType): { mount: Mount };`}</Sig>
            <p className={styles.para}>
              <Code>{'openRoute(path, { duplicate: true })'}</Code> opens a second tab for the same
              page. <Code>{'navigate(path, { replace: true })'}</Code> replaces the history entry
              instead of adding one.
            </p>
          </Entry>

          <Entry
            id="r-pane"
            name="pane"
            when="Loaded when the pane is first shown. mount is called each time it is shown."
          >
            <Sig>{`function definePane(p: {
  mount: Mount;
  fit?: 'content';
}): Pane;`}</Sig>
          </Entry>

          <Entry
            id="r-commands"
            name="commands"
            when="Loaded the first time one of this plugin's commands runs."
          >
            <Sig>{`interface CommandContext { host: PluginHost; caller: string }   // the calling plugin's id, or 'user'

function defineCommands(
  handlers: Record<string, (args: Record<string, string | number>, ctx: CommandContext) => void | Promise<void>>,
): Commands;`}</Sig>
            <p className={styles.para}>
              Arguments typed in the prompt bar arrive as strings. A handler that throws produces a
              toast naming the command. The tab appears when <Code>openRoute</Code> is called, so a
              handler that opens a page calls it before its first <Code>await</Code>.
            </p>
          </Entry>

          <Entry
            id="r-prompt"
            name="prompt"
            when="Loaded when Settings names this plugin as the assistant. handle is called when the user sends text that is not a slash command."
          >
            <Sig>{`interface Destination {
  label: string;                 // where the next message lands
  path?: string;                 // this plugin's page for it; the bar offers a jump there
  options?: { key: string; label: string }[];   // other places it could land
  select?: (key: string) => void;               // the user picked one
}

function definePrompt(p: {
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  newConversation: (ctx: { host: PluginHost }) => void | Promise<void>;   // New, in the destination menu
  destination?: {
    current: () => Destination | null;
    subscribe: (onChange: () => void) => () => void;   // call onChange when current() changes; returns an unsubscribe
  };
}): Prompt;`}</Sig>
            <p className={styles.para}>
              <Code>q.signal</Code> aborts when the user presses Stop or sends another message.
            </p>
          </Entry>

          <Entry
            id="r-intent"
            name="intent"
            when="Loaded at startup. index is called once the module arrives; suggest on every keystroke that is not a slash command, and again when a plugin's offer lands later, when Settings names this plugin."
          >
            <Sig>{`type DeclaredCommand = SlashCommand & { plugin: string; pluginTitle: string };

interface Suggestion {
  call: CommandCall;             // command qualified as "plugin:name"
  detail?: string;               // the row's caption, in place of the plugin's title
  score: number;                 // higher is closer; rows keep the order returned
}

function defineIntent(i: {
  index: (commands: DeclaredCommand[]) => void;
  suggest: (q: Query) => Suggestion[] | Promise<Suggestion[]>;   // q.text, q.terms, q.offers, q.signal
}): Intent;`}</Sig>
          </Entry>

          <Entry
            id="r-handles"
            name="Handles"
            when="Given to every mount, command handler and prompt handler. In React, read them with the hooks."
          >
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;   // this plugin's page
  execute: (command: string, args?: Record<string, string | number>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;
  cart: Cart;
}

interface PanelHandle {
  id: string;
  plugin: string;
  kind: 'route' | 'pane';
  path: string;                  // '' for a pane
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: { label: string; path?: string; icon?: string }[]) => void;
  setTerms: (terms: string[]) => void;
  subscribe: (listener: () => void) => Cleanup;   // path or focus changed
}

interface Cart {
  add: (item: CartItem) => void; // same id replaces
  remove: (id: string) => void;  // this plugin's items only
  items: () => readonly CartItem[]; // this plugin's items only
  has: (id: string) => boolean;  // this plugin's items only
  count: () => number;           // this plugin's items only
  subscribe: (listener: () => void) => Cleanup;
}

// React
function useHost(): PluginHost;
function usePanel(): PanelHandle;         // re-renders on path and focus
function useCart(): Cart;                 // re-renders on change
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: { label: string; path?: string; icon?: string }[]): void;
function usePanelTerms(terms: string[]): void;
function CartButton(props: { item: CartItem; labelled?: boolean }): JSX.Element;   // the design system's, bound to the cart`}</Sig>
            <p className={styles.para}>
              <Code>setCrumbs</Code> draws a trail above the panel; a crumb with a <Code>path</Code>{' '}
              is a link that moves the panel there. A component that throws is replaced inside its
              panel by the error and a Try again button.
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
            <Symptom name="Invalid hook call, or a context that is always null">
              The bundle carried its own copy of React or the SDK. <Code>mf-manifest.json</Code> in
              the build output lists what was shared; a package missing there was missing from{' '}
              <Code>package.json</Code> when the build ran.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the panel's tree, for example in a portal. The handle
              exists only inside that tree; a component rendered elsewhere receives it as a prop.
            </Symptom>
            <Symptom name="A command completes, then fails">
              The toast says why: <Code>vite.config.ts</Code> does not name <Code>commands</Code>,
              the module has no handler for that name, or the handler threw.
            </Symptom>
            <Symptom name="A recommendation never appears">
              In order of likelihood: <Code>background</Code> is named in{' '}
              <Code>vite.config.ts</Code>; the console does not report it failing to load;{' '}
              <Code>terms</Code> returns a term that <Code>recommend</Code> handles; the item is not
              already in the cart. Commands are shown only for typed text, and a plugin is not asked
              about its own page's terms.
            </Symptom>
            <Symptom name="This panel crashed">
              Either the module failed to load, or the component threw while rendering. "exposed
              nothing at ./route" means the file has no default export. A load failure is retried
              when the tab is closed and reopened.
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
