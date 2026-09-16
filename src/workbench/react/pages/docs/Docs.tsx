import type { ReactNode } from 'react';
import { CodeBlock } from '@kbase/design-system';
import { SDK_VERSION, usePanelTitle } from '@kbase/plugin-sdk';
import styles from './Docs.module.css';

// The plugin contract as it is meant to be: the page is the specification and
// the implementation is measured against it (Docs.contract.test.ts).
//
// Overview, Getting started, Anatomy, Lifecycle, Manifest reference, API
// reference, Deployment, Troubleshooting. Reference entries are name, one-line
// description, signature, example, parameters table, returns.

export function DocsDocument() {
  usePanelTitle('Plugin developer documentation');
  return (
    <div className={styles.layout}>
      <Rail />
      <article className={styles.root}>
        <header className={styles.head} id="top">
          <h1 className="h2">Plugin developer documentation</h1>
          <p className={styles.narrative}>
            A workbench plugin is a Vite project that exports a manifest and up to six modules. The
            SDK's Vite plugin builds it into a Module Federation remote, served by the plugin's own
            backend. The workbench fetches the manifest at startup and loads each module on demand.
          </p>
        </header>

        <Part id="concepts" title="Concepts and usage">
          <p className={styles.narrative}>The plugin API covers these areas.</p>
          <Explainer>
            <p className={styles.para}>
              <strong>Manifest.</strong> <Code>plugin.config.ts</Code> declares the plugin's id,
              title, icon, commands, shortcuts and launcher. The build writes it to{' '}
              <Code>manifest.json</Code> with the SDK version and the module list. The workbench
              registers the declared commands and lists the plugin in Settings and on Home before
              loading any plugin code.
            </p>
            <p className={styles.para}>
              <strong>Modules.</strong> Each module is a file named in <Code>vite.config.ts</Code>{' '}
              whose default export is created with a <Code>define*</Code> helper. <Code>route</Code>{' '}
              renders the plugin's page. <Code>pane</Code> renders its sidebar panel.{' '}
              <Code>commands</Code> implements the declared slash commands. <Code>background</Code>{' '}
              extracts terms from typed text, offers commands, returns related items, and publishes
              status bar items. <Code>prompt</Code> receives submitted free text.{' '}
              <Code>intent</Code> ranks command suggestions for free text.
            </p>
            <p className={styles.para}>
              <strong>Panels.</strong> Pages and panes are panels. The workbench calls the module's{' '}
              <Code>mount(element, context)</Code> once per panel and the returned cleanup when the
              panel is removed. <Code>fromReact</Code> wraps a React component as a mount. The panel
              API reports the panel's path and focus and sets its title, breadcrumbs and terms.
            </p>
            <p className={styles.para}>
              <strong>Commands.</strong> A command is declared in the manifest and implemented in
              the <Code>commands</Code> module. It runs from the prompt bar, the Shortcuts pane, the
              launcher card on Home, a suggestion row, a status bar item, or another plugin's{' '}
              <Code>host.execute</Code>. Commands are registered as{' '}
              <Code>&lt;id&gt;:&lt;name&gt;</Code>. Every argument is a string.
            </p>
            <p className={styles.para}>
              <strong>Terms.</strong> A term is a namespaced identifier such as{' '}
              <Code>uniprot:P0AEX9</Code>. A page declares terms with <Code>setTerms</Code>, a cart
              item carries terms, and <Code>background.terms</Code> extracts terms from typed text.
              The workbench passes terms between plugins unchanged; a plugin acts on the namespaces
              it recognises.
            </p>
            <p className={styles.para}>
              <strong>Cart.</strong> The cart holds references the user has collected. A plugin adds
              items with <Code>cart.add</Code> and reads back its own items. When free text is
              submitted, the cart's items are passed to the assistant as attachments and the cart is
              cleared.
            </p>
            <p className={styles.para}>
              <strong>Assistant and suggestions.</strong> Settings selects one plugin with a{' '}
              <Code>prompt</Code> module as the assistant and one with an <Code>intent</Code> module
              as the suggestion provider. Submitted free text goes to the assistant. The rows shown
              under the prompt bar while typing come from the provider.
            </p>
            <p className={styles.para}>
              <strong>Error handling.</strong> Every value passed to the workbench is validated
              against a zod schema. An invalid argument to a host or panel call throws a{' '}
              <Code>TypeError</Code>. An invalid item in a callback result is discarded and a
              warning naming the plugin is logged. A panel that throws is contained by an error
              boundary with a retry button.
            </p>
          </Explainer>
        </Part>

        <Part id="start" title="Getting started">
          <p className={styles.narrative}>
            This tutorial builds a plugin with one slash command and one page and connects it to a
            workbench dev server. Prerequisites: Node.js, npm, and a checkout of the workbench
            repository in which <Code>npm run build:plugin-sdk</Code> has produced{' '}
            <Code>dist-plugin-sdk/</Code>.
          </p>
          <Step title="Create the project">
            <p className={styles.para}>Scaffold a Vite project and add the SDK:</p>
            <File name="" language="bash">{`npm create vite@latest hello -- --template react-ts
cd hello
rm -r src/* public
npm i file:../next-gen-ui/dist-plugin-sdk
npm i -D @module-federation/vite`}</File>
            <p className={styles.para}>
              <Code>index.html</Code> stays: Vite requires an HTML entry, and the workbench never
              loads it.
            </p>
          </Step>
          <Step title="Add the manifest">
            <p className={styles.para}>
              Create <Code>plugin.config.ts</Code>:
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
            <p className={styles.para}>
              Add it to the Node project in <Code>tsconfig.node.json</Code>:
            </p>
            <File
              name="tsconfig.node.json"
              language="json"
            >{`"include": ["vite.config.ts", "plugin.config.ts"]`}</File>
          </Step>
          <Step title="Configure the build">
            <p className={styles.para}>
              Replace <Code>vite.config.ts</Code>:
            </p>
            <File name="vite.config.ts" language="typescript">{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginFederation } from '@kbase/plugin-sdk/vite';
import config from './plugin.config.ts';

export default defineConfig({
  plugins: [
    pluginFederation({ config, route: './src/route.tsx', commands: './src/commands.ts' }),
    react(),
  ],
});`}</File>
            <p className={styles.para}>
              <Code>pluginFederation</Code> exposes each named file as a module and emits the
              manifest.
            </p>
          </Step>
          <Step title="Add the page and the command">
            <p className={styles.para}>
              Create <Code>src/route.tsx</Code>:
            </p>
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

export default defineRoute(fromReact(Hello), { normalize: (path) => path.toLowerCase() });`}</File>
            <p className={styles.para}>
              Create <Code>src/commands.ts</Code>:
            </p>
            <File
              name="src/commands.ts"
              language="typescript"
            >{`import { defineCommands } from '@kbase/plugin-sdk';

export default defineCommands({ hello: ({ who }, { host }) => host.openRoute(\`/\${who ?? ''}\`) });`}</File>
            <p className={styles.para}>
              The handler opens the page at <Code>/&lt;who&gt;</Code>. The page reads the name back
              from <Code>usePanel().path</Code>.
            </p>
          </Step>
          <Step title="Build">
            <File name="" language="bash">{`npm run build`}</File>
            <p className={styles.para}>
              <Code>dist/</Code> now contains <Code>remoteEntry.js</Code>, one chunk per module, and{' '}
              <Code>manifest.json</Code>. The manifest is emitted only by a production build, so the
              workbench always loads a plugin from build output; <Code>vite build --watch</Code>{' '}
              rebuilds on every change. Chunk URLs are resolved relative to{' '}
              <Code>remoteEntry.js</Code>, so <Code>base</Code> can stay at Vite's default. Set{' '}
              <Code>base: '/services/hello/plugin/'</Code> if the bundle references static assets
              such as images or CSS <Code>url()</Code>.
            </p>
          </Step>
          <Step title="Serve">
            <p className={styles.para}>
              Serve the build output from the plugin's backend at two routes:
            </p>
            <Table
              head={['Route', 'Serves']}
              rows={[
                [<Code>/services/hello/manifest.json</Code>, <Code>dist/manifest.json</Code>],
                [<Code>/services/hello/plugin/*</Code>, <Code>dist/*</Code>],
              ]}
            />
          </Step>
          <Step title="Connect to the workbench">
            <p className={styles.para}>
              In the workbench checkout, add the plugin's origin to{' '}
              <Code>.env.development.local</Code> and start the workbench dev server:
            </p>
            <File
              name=".env.development.local"
              language="bash"
            >{`VITE_DEV_SERVICE_PROXY=/services/hello=http://127.0.0.1:8899`}</File>
            <p className={styles.para}>
              The dev server proxies <Code>/services/hello</Code> to that origin and lists the
              plugin at <Code>/plugin-registry/plugins</Code>, the endpoint the workbench reads at
              startup. Adding an origin requires a dev server restart; rebuilding the plugin
              requires a page reload.
            </p>
          </Step>
          <Step title="Try it">
            <ol className={styles.steps}>
              <li>
                Open Home. A Hello card appears, from <Code>launcher</Code>. Clicking it runs{' '}
                <Code>hello</Code> with no arguments and opens a tab that reads "Hello, nobody."
              </li>
              <li>
                Type <Code>/hello Alice</Code> in the prompt bar. A tab titled Alice opens at{' '}
                <Code>/p/hello/Alice</Code>.
              </li>
              <li>
                Type <Code>/hello alice</Code>. The Alice tab is focused instead of a second tab
                opening, because <Code>normalize</Code> maps both paths to the same string.
              </li>
              <li>
                Open <Code>/p/hello/Alice</Code> in a new browser tab. The same page opens from the
                URL.
              </li>
            </ol>
          </Step>
        </Part>

        <Part id="anatomy" title="Anatomy of a plugin">
          <p className={styles.narrative}>The tutorial plugin has this structure.</p>
          <File name="" language="text">{`hello/
├── plugin.config.ts     // manifest: id, title, commands, launcher
├── vite.config.ts       // pluginFederation: which files are modules
├── src/
│   ├── route.tsx        // route module: the page
│   └── commands.ts      // commands module: slash command handlers
└── dist/                // build output, served by the plugin's backend
    ├── remoteEntry.js   // Module Federation entry
    ├── manifest.json    // plugin.config.ts plus sdkVersion and modules
    └── assets/          // one chunk per module`}</File>
          <Explainer>
            <p className={styles.para}>
              <strong>Manifest fields.</strong> The most important fields, in{' '}
              <Code>plugin.config.ts</Code>:
            </p>
            <ul className={styles.list}>
              <li>
                <Code>id</Code>: the plugin's unique identifier. It appears in every page URL and in
                saved layouts, so it is permanent.
              </li>
              <li>
                <Code>title</Code>, <Code>icon</Code>, <Code>color</Code>: how the plugin is shown
                in tabs, rows and cards.
              </li>
              <li>
                <Code>commands</Code>: the slash commands the plugin implements, with their
                arguments.
              </li>
              <li>
                <Code>launcher</Code>, <Code>shortcuts</Code>: command invocations shown as a card
                on Home and as buttons in the Shortcuts pane.
              </li>
              <li>
                <Code>sdkVersion</Code>, <Code>modules</Code>: written by the build. The workbench
                loads a plugin only when <Code>sdkVersion</Code> is compatible.
              </li>
            </ul>
            <p className={styles.para}>
              <strong>Module files.</strong> Each module file has one default export:
            </p>
            <ul className={styles.list}>
              <li>
                <Code>defineRoute({'{ mount, normalize }'})</Code>: the page.
              </li>
              <li>
                <Code>definePane({'{ mount, fit? }'})</Code>: the sidebar panel.
              </li>
              <li>
                <Code>defineCommands({'{ [name]: handler }'})</Code>: one handler per declared
                command.
              </li>
              <li>
                <Code>defineBackground({'{ terms?, offer?, relate?, status? }'})</Code>: callbacks
                the workbench invokes on its own schedule.
              </li>
              <li>
                <Code>definePrompt({'{ handle, newConversation, destination? }'})</Code>: the
                assistant.
              </li>
              <li>
                <Code>defineIntent({'{ index, suggest }'})</Code>: the suggestion provider.
              </li>
            </ul>
            <p className={styles.para}>
              Each <Code>define*</Code> helper types its argument and returns it unchanged.
            </p>
          </Explainer>
        </Part>

        <Part id="lifecycle" title="Lifecycle">
          <p className={styles.narrative}>
            A plugin is discovered at startup, its modules are loaded when needed, and its panels
            are mounted and unmounted as the layout changes.
          </p>
          <Explainer>
            <p className={styles.para}>
              <strong>Load.</strong> The workbench fetches <Code>/plugin-registry/plugins</Code> at
              startup and registers every accepted manifest. <Code>background</Code> and{' '}
              <Code>intent</Code> are loaded immediately, because the workbench calls them on its
              own schedule. <Code>route</Code>, <Code>pane</Code>, <Code>commands</Code> and{' '}
              <Code>prompt</Code> are loaded on first use. A module that fails to load is logged and
              skipped; a panel whose module fails to load shows a retry button.
            </p>
            <Table
              head={['Module', 'Loaded', 'Members called']}
              rows={[
                [
                  <Code>background</Code>,
                  'at startup, for every installed plugin that has one',
                  <>
                    <Code>terms</Code> and <Code>offer</Code> on every change to free text;{' '}
                    <Code>relate</Code> 250 ms after the active tab's or the cart's terms change;{' '}
                    <Code>status</Code> once, when the module loads
                  </>,
                ],
                [
                  <Code>intent</Code>,
                  'at startup, for every installed plugin that has one',
                  <>
                    <Code>index</Code> once, when the module loads; <Code>suggest</Code>, for the
                    selected provider only, on every change to free text, when an <Code>offer</Code>{' '}
                    resolves asynchronously, and when the active tab's or the cart's terms change
                    while text is in the bar
                  </>,
                ],
                [
                  <Code>prompt</Code>,
                  'when the plugin is selected as the assistant',
                  <>
                    <Code>destination</Code> once, when the module loads; <Code>handle</Code> on
                    each submitted message; <Code>newConversation</Code> from New in the destination
                    menu
                  </>,
                ],
                [
                  <Code>route</Code>,
                  'when the plugin’s first tab opens, or when a restored tab is first rendered',
                  <>
                    <Code>mount</Code> once per tab, and again after Restart panel
                  </>,
                ],
                [
                  <Code>pane</Code>,
                  'when the pane is first rendered: a pinned pane at startup, a preview from Home, or the flyout from the collapsed sidebar',
                  <>
                    <Code>mount</Code> once, and again after the pane is unfolded or restarted
                  </>,
                ],
                [
                  <Code>commands</Code>,
                  'the first time one of the plugin’s commands runs',
                  'the handler with the command’s name, on each run',
                ],
              ]}
            />
            <p className={styles.para}>
              <strong>Run.</strong> <Code>mount()</Code> runs when a panel is first rendered, with a
              fresh element and the panel and host APIs. The panel's DOM is created once and
              re-parented when the layout changes: moving a tab to another group, splitting a group,
              moving a pane between the sidebar and the main area, switching tabs and collapsing the
              sidebar keep the plugin's root mounted. <Code>mount()</Code> runs again after Restart
              panel, after a folded pane is unfolded, and after a page reload restores the tab from
              the saved layout.
            </p>
            <p className={styles.para}>
              <strong>Unload.</strong> The cleanup returned by <Code>mount()</Code> runs when the
              tab is closed, when the pane is unpinned or folded, and before a restart. The title,
              breadcrumbs and terms of a closed panel are discarded. The layout, the cart and the
              settings are saved to browser storage on every change and restored on the next load.
            </p>
          </Explainer>
        </Part>

        <Part id="manifest" title="Manifest reference">
          <p className={styles.narrative}>
            <Code>plugin.config.ts</Code> exports a <Code>PluginConfig</Code>. The build adds{' '}
            <Code>sdkVersion</Code> and <Code>modules</Code> and writes the result to{' '}
            <Code>manifest.json</Code> as a <Code>Manifest</Code>. A typical manifest:
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
      title: 'Open the evidence dossier for a protein',
      args: [{ name: 'q', description: 'a UniProt or RefSeq id, a gene name, or a sequence' }],
    },
    { name: 'compare', title: 'Compare with a taxon', args: [{ name: 'taxid', required: true }] },
  ],
  shortcuts: [{ label: 'Dossier', command: 'open', args: { q: 'P0AEX9' } }],
  launcher: { label: 'Function Junction', command: 'open' },
});`}</File>
          <Entry id="m-plugin" name="Plugin properties">
            <Params
              heading="Properties"
              rows={[
                {
                  name: 'id',
                  required: true,
                  type: 'string',
                  description: (
                    <>
                      A unique identifier matching <Code>/^[a-z][a-z0-9-]{'{1,40}'}$/</Code>. Used
                      in page URLs and saved layouts; permanent once published.
                    </>
                  ),
                },
                { name: 'title', required: true, type: 'string', description: 'The display name.' },
                {
                  name: 'description',
                  type: 'string',
                  description:
                    'One sentence about the plugin. Shown on the launcher card and pane rows, and indexed for suggestions.',
                },
                {
                  name: 'icon',
                  type: 'string',
                  description: 'A name from the icon table below. Defaults to a pin.',
                },
                {
                  name: 'color',
                  type: 'string',
                  description: (
                    <>
                      One of <Code>blue</Code>, <Code>green</Code>, <Code>teal</Code>,{' '}
                      <Code>purple</Code>, <Code>orange</Code>, <Code>red</Code>. Tints the icon
                      wherever it appears. Defaults to the surrounding text colour.
                    </>
                  ),
                },
                {
                  name: 'commands',
                  type: 'SlashCommand[]',
                  description: 'The slash commands the plugin implements. See Command properties.',
                },
                {
                  name: 'shortcuts',
                  type: 'CommandCall[]',
                  description:
                    'Buttons in the Shortcuts sidebar pane. See Command call properties.',
                },
                {
                  name: 'launcher',
                  type: 'CommandCall',
                  description:
                    'The card on Home. Without a launcher the plugin is not listed as an app.',
                },
                {
                  name: 'sdkVersion',
                  type: 'string',
                  description: 'Written by the build: the SDK version the plugin was built with.',
                },
                {
                  name: 'modules',
                  type: 'Module[]',
                  description: (
                    <>
                      Written by the build: the modules named in <Code>vite.config.ts</Code>, in the
                      order background, route, pane, commands, prompt, intent.
                    </>
                  ),
                },
              ]}
            />
            <p className={styles.para}>
              <strong>Version compatibility.</strong> This workbench serves SDK{' '}
              <Code>{SDK_VERSION}</Code>. Under a 0.x SDK a manifest is accepted when its{' '}
              <Code>sdkVersion</Code> has the same major and minor version. From 1.0.0, it is
              accepted with the same major version and a minor version at or below the workbench's.
              A rejected manifest is listed on Settings under Not loaded with the reason, and the
              console logs <Code>plugin registry: not loading fj, built against SDK 0.3.0: …</Code>.
            </p>
            <p className={styles.para}>
              <strong>Icon table.</strong> <Code>Briefcase</Code>, <Code>ChatCircle</Code>,{' '}
              <Code>ChatCircleDots</Code>, <Code>ChatCirclePlus</Code>, <Code>Code</Code>,{' '}
              <Code>Database</Code>, <Code>Flask</Code>, <Code>FolderOpen</Code>, <Code>Gear</Code>,{' '}
              <Code>Globe</Code>, <Code>GraduationCap</Code>, <Code>HandWaving</Code>,{' '}
              <Code>House</Code>, <Code>Lightning</Code>, <Code>LinkSimple</Code>,{' '}
              <Code>ListChecks</Code>, <Code>Nut</Code>, <Code>SquaresFour</Code>,{' '}
              <Code>Table</Code>, <Code>TreeStructure</Code>.
            </p>
          </Entry>
          <Entry id="m-command" name="Command properties">
            <Params
              heading="Properties"
              rows={[
                {
                  name: 'name',
                  required: true,
                  type: 'string',
                  description: (
                    <>
                      The slash name, matching <Code>/^[a-z][a-z0-9-]*$/</Code>. Registered as{' '}
                      <Code>&lt;id&gt;:&lt;name&gt;</Code>. <Code>/open</Code> resolves while
                      exactly one installed plugin declares <Code>open</Code>; otherwise the prompt
                      bar reports{' '}
                      <Code>/open is declared by a:open and b:open; type one of them</Code>.
                    </>
                  ),
                },
                {
                  name: 'title',
                  required: true,
                  type: 'string',
                  description: 'Shown beside the command in completions.',
                },
                { name: 'description', type: 'string', description: 'Indexed for suggestions.' },
                {
                  name: 'args',
                  type: 'ArgDecl[]',
                  description:
                    'The arguments, in the order they are typed. See Argument properties.',
                },
                {
                  name: 'icon',
                  type: 'string',
                  description:
                    "The icon for the command's Shortcuts button. Defaults to the plugin's icon.",
                },
                {
                  name: 'semantics.description',
                  type: 'string',
                  description:
                    'What the command does, in the words a user would type. Indexed for suggestions; never displayed.',
                },
                {
                  name: 'semantics.examples',
                  type: 'string[]',
                  description: 'Phrasings that should match this command. Indexed for suggestions.',
                },
              ]}
            />
          </Entry>
          <Entry id="m-arg" name="Argument properties">
            <Params
              heading="Properties"
              rows={[
                {
                  name: 'name',
                  required: true,
                  type: 'string',
                  description: (
                    <>
                      Matches <Code>/^[a-z][a-z0-9-]*$/</Code>. The key under which the value is
                      passed to the handler.
                    </>
                  ),
                },
                {
                  name: 'description',
                  type: 'string',
                  description:
                    'What kind of value the argument takes. The bundled suggestion provider uses it to bind identifiers to arguments.',
                },
                {
                  name: 'required',
                  type: 'boolean',
                  description:
                    'When true, the prompt bar reports a missing value before the command runs, and suggestions omit the command when nothing fills the argument.',
                },
              ]}
            />
          </Entry>
          <Entry id="m-call" name="Command call properties">
            <p className={styles.para}>
              A command call is a command with its arguments filled in. It is used by{' '}
              <Code>launcher</Code>, <Code>shortcuts</Code>, an <Code>Offer</Code>, a{' '}
              <Code>Suggestion</Code> and a <Code>StatusItem</Code> action.
            </p>
            <Params
              heading="Properties"
              rows={[
                {
                  name: 'label',
                  required: true,
                  type: 'string',
                  description: 'The button or row text.',
                },
                {
                  name: 'command',
                  required: true,
                  type: 'string',
                  description: (
                    <>
                      <Code>plugin:name</Code>, or <Code>name</Code> for the declaring plugin's own
                      command.
                    </>
                  ),
                },
                {
                  name: 'args',
                  type: 'Record<string, string>',
                  description: 'Argument values by name.',
                },
              ]}
            />
            <p className={styles.para}>More formally:</p>
            <Sig>{`type PluginConfig = Omit<Manifest, 'sdkVersion' | 'modules'>;

interface Manifest {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  commands?: SlashCommand[];
  shortcuts?: CommandCall[];
  launcher?: CommandCall;
  sdkVersion: string;            // written by the build
  modules: Module[];             // written by the build
}

interface SlashCommand {
  name: string;
  title: string;
  description?: string;
  args?: ArgDecl[];
  icon?: string;
  semantics?: {
    description: string;
    examples?: string[];
  };
}

interface ArgDecl {
  name: string;
  description?: string;
  required?: boolean;
}

interface CommandCall {
  label: string;
  command: string;
  args?: Record<string, string>;
}

function definePluginManifest(config: PluginConfig): PluginConfig;`}</Sig>
          </Entry>
        </Part>

        <Part id="reference" title="API reference">
          <p className={styles.narrative}>
            Modules, then the host API, the panel API, the cart API, the React helpers and the build
            plugin. Every signature is checked against the SDK source by the test suite.
          </p>

          <Entry id="r-background" name="background">
            <p className={styles.para}>
              Callbacks the workbench invokes on its own schedule. All four members are optional.
              Loaded at startup.
            </p>
            <Sig>{`type Cleanup = () => void;
type Subscribe<T> = (set: (value: T) => void) => Cleanup;

interface Background {
  terms?: (q: TypedText) => string[];
  offer?: (q: TypedQuery) => Offer[] | Promise<Offer[]>;
  relate?: (q: TermsQuery) => CartItem[] | Promise<CartItem[]>;
  status?: Subscribe<StatusItem[]>;
}

function defineBackground(b: Background): Background;`}</Sig>
            <p className={styles.para}>Example:</p>
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

  offer: ({ terms }) =>
    idsIn(terms).map((id) => ({
      label: \`Evidence dossier for \${id}\`,
      command: 'open',
      args: { q: id },
      match: { term: \`uniprot:\${id}\`, kind: 'identifier' },
    })),

  relate: async ({ terms, signal }) => {
    const rows = await Promise.all(idsIn(terms).map((id) => fetchSummary(id, signal)));
    return rows.filter(Boolean).map((row) => ({
      id: \`function-junction:protein:\${row.id}\`,
      name: row.name,
      subject: row.id,
      summary: row.verdict,
      terms: [\`uniprot:\${row.id}\`, \`ncbitaxon:\${row.taxon}\`],
      answers: [{ term: \`uniprot:\${row.id}\`, kind: 'record' }],
      source: { command: 'open', args: { q: row.id } },
      context: { measuredOver: row.population },
    }));
  },

  status: (set) => {
    const push = () => set(pending() > 0 ? [{ text: \`\${pending()} lookups running\` }] : []);
    push();
    return lookups.subscribe(push);
  },
});`}</File>

            <Export id="r-terms" name="terms">
              <p className={styles.para}>
                Extracts terms from typed text. Called synchronously on every change to free text in
                the prompt bar.
              </p>
              <Sig>{`interface TypedText {
  text: string;
}`}</Sig>
              <Params
                rows={[
                  {
                    name: 'q.text',
                    required: true,
                    type: 'string',
                    description: 'The prompt bar text, trimmed.',
                  },
                ]}
              />
              <Returns>
                An array of terms. The arrays from all plugins are merged and passed to{' '}
                <Code>offer</Code> and to <Code>suggest</Code>. Each term is validated as a string;
                an invalid entry is discarded and a warning is logged. A returned promise is treated
                as an empty array. A thrown error is logged and counts as an empty result.
              </Returns>
            </Export>

            <Export id="r-offer" name="offer">
              <p className={styles.para}>
                Offers commands for typed text. Called on every change to free text, after every
                plugin's <Code>terms</Code>.
              </p>
              <Sig>{`interface TypedQuery {
  text: string;
  terms: string[];
  signal: AbortSignal;
}

type MatchKind =
  | 'record'                     // the plugin holds the record
  | 'identifier'                 // the term is an id in a namespace the plugin serves, matched by pattern
  | 'name';                      // a name or description matched the words

interface Match {
  term: string;
  kind: MatchKind;
}

interface Offer extends CommandCall {
  match: Match;
}`}</Sig>
              <Params
                rows={[
                  {
                    name: 'q.text',
                    required: true,
                    type: 'string',
                    description: 'The prompt bar text.',
                  },
                  {
                    name: 'q.terms',
                    required: true,
                    type: 'string[]',
                    description: 'The merged terms every plugin extracted from the text.',
                  },
                  {
                    name: 'q.signal',
                    required: true,
                    type: 'AbortSignal',
                    description:
                      'Aborted on the next change to the text and when the text is cleared.',
                  },
                ]}
              />
              <Returns>
                An array of <Code>Offer</Code>, or a promise of one. Each offer is validated; an
                invalid offer is discarded and a warning is logged. Offers are not displayed
                directly: they are passed to the suggestion provider with each <Code>command</Code>{' '}
                qualified, and <Code>suggest</Code> is called again when a promise resolves. A
                result that resolves after the signal aborted is discarded. A thrown error or
                rejection is logged and counts as no offers.
              </Returns>
              <Params
                heading="Offer properties"
                rows={[
                  { name: 'label', required: true, type: 'string', description: 'The row text.' },
                  {
                    name: 'command',
                    required: true,
                    type: 'string',
                    description: "The plugin's own command name, or plugin:name.",
                  },
                  {
                    name: 'args',
                    type: 'Record<string, string>',
                    description: 'Argument values by name.',
                  },
                  {
                    name: 'match.term',
                    required: true,
                    type: 'string',
                    description: 'The term the offer answers, as it appeared in q.terms.',
                  },
                  {
                    name: 'match.kind',
                    required: true,
                    type: 'MatchKind',
                    description: (
                      <>
                        How the term was matched. The bundled provider ranks <Code>record</Code>{' '}
                        above <Code>identifier</Code> above <Code>name</Code>.
                      </>
                    ),
                  },
                ]}
              />
            </Export>

            <Export id="r-relate" name="relate">
              <p className={styles.para}>
                Returns items related to the terms of the open page or the cart. Called 250 ms after
                those terms change, once per plugin that implements it; the plugin that owns the
                active tab is not called for the page's terms.
              </p>
              <Sig>{`interface TermsQuery {
  terms: string[];
  signal: AbortSignal;
}`}</Sig>
              <Params
                rows={[
                  {
                    name: 'q.terms',
                    required: true,
                    type: 'string[]',
                    description:
                      'The terms to look up. When the term set grew, only the new terms.',
                  },
                  {
                    name: 'q.signal',
                    required: true,
                    type: 'AbortSignal',
                    description:
                      "Aborted when the same source's terms change again, when they become empty, or when the workbench unmounts.",
                  },
                ]}
              />
              <Returns>
                An array of <Code>CartItem</Code>, or a promise of one. Each item is validated; an
                invalid item is discarded and a warning naming the plugin is logged. A thrown error
                or a rejected promise counts as an empty result. Items are shown in the Related
                pane; if the query changed before the promise resolved, the result is discarded.
                When the term set grew, the new items are merged with the plugin's items already
                displayed.
              </Returns>
              <p className={styles.para}>
                In the Related pane, clicking a row runs the item's <Code>source</Code> command in
                the plugin that returned it. The row's cart button adds the item to that plugin's
                cart without <Code>answers</Code>. Dismissing a row hides that item id for the
                session.
              </p>
            </Export>

            <Export id="r-status" name="status">
              <p className={styles.para}>
                Publishes status bar items. Called once, when the module loads, with a setter. The
                subscription lasts for the session.
              </p>
              <Sig>{`interface StatusItem {
  text: string;
  action?: CommandCall;
}`}</Sig>
              <Params
                rows={[
                  {
                    name: 'set',
                    required: true,
                    type: '(items: StatusItem[]) => void',
                    description:
                      "Replaces the plugin's items in the status bar. An empty array removes them. Each item is validated; an invalid item is discarded and a warning is logged.",
                  },
                ]}
              />
              <Returns>
                A cleanup function. If <Code>status</Code> throws, the error is logged and the
                plugin is not subscribed again.
              </Returns>
              <Params
                heading="StatusItem properties"
                rows={[
                  { name: 'text', required: true, type: 'string', description: 'The item text.' },
                  {
                    name: 'action',
                    type: 'CommandCall',
                    description:
                      'Run when the item is clicked. The item is disabled while the command runs.',
                  },
                ]}
              />
            </Export>
          </Entry>

          <Entry id="r-route" name="route">
            <p className={styles.para}>
              Renders the plugin's page in a tab. Loaded when the plugin's first tab opens, or when
              a tab restored from the saved layout is first rendered.
            </p>
            <Sig>{`type Mount = (el: HTMLElement, ctx: { panel: PanelHandle; host: PluginHost }) => Cleanup | void;

interface Route {
  mount: Mount;
  normalize: (path: string) => string;
}

function defineRoute(r: Route): Route;
function defineRoute(body: { mount: Mount }, rest: Omit<Route, 'mount'>): Route;`}</Sig>
            <p className={styles.para}>Example:</p>
            <File name="src/route.tsx" language="tsx">{`function Dossier() {
  const { path, navigate } = usePanel();
  const id = path.slice(1);
  usePanelTitle(id || 'Function Junction');
  usePanelTerms(id ? [\`uniprot:\${id}\`] : []);
  if (!id) return <SearchBox onPick={(picked) => navigate(\`/\${picked}\`)} />;
  return <Report id={id} />;
}

export default defineRoute(fromReact(Dossier), {
  normalize: (path) => path.split('?')[0].toUpperCase(),
});`}</File>
            <Export id="r-mount" name="mount">
              <p className={styles.para}>
                Renders the panel. Called once per tab when the module has loaded, and again after
                Restart panel.
              </p>
              <Params
                rows={[
                  {
                    name: 'el',
                    required: true,
                    type: 'HTMLElement',
                    description:
                      'An empty element inside the panel. A new element is created for each call.',
                  },
                  {
                    name: 'ctx.panel',
                    required: true,
                    type: 'PanelHandle',
                    description: 'The panel API.',
                  },
                  {
                    name: 'ctx.host',
                    required: true,
                    type: 'PluginHost',
                    description: 'The host API.',
                  },
                ]}
              />
              <Returns>
                A cleanup function, or nothing. The cleanup runs when the tab is closed and before a
                restart. If <Code>mount</Code> throws, the panel shows "This panel crashed" with a
                Restart panel button.
              </Returns>
            </Export>
            <Export id="r-normalize" name="normalize">
              <p className={styles.para}>
                Maps a path to a canonical string. Two paths with the same result are the same page.
                Called by <Code>openRoute</Code> with the requested path and with each open tab's
                path.
              </p>
              <Params
                rows={[
                  {
                    name: 'path',
                    required: true,
                    type: 'string',
                    description: (
                      <>
                        Everything after <Code>/p/&lt;id&gt;</Code> in the tab URL, including the
                        query string.
                      </>
                    ),
                  },
                ]}
              />
              <Returns>
                A string. If the return value is not a string, it is ignored, a warning is logged,
                and the path is compared as-is.
              </Returns>
            </Export>
            <p className={styles.para}>
              Until the panel sets a title, the tab shows the plugin title and the path,{' '}
              <Code>Function Junction: /P0AEX9</Code>. The address bar reflects the focused tab:{' '}
              <Code>navigate</Code> in the focused tab pushes a history entry, or replaces it with{' '}
              <Code>{'{ replace: true }'}</Code>.
            </p>
          </Entry>

          <Entry id="r-pane" name="pane">
            <p className={styles.para}>
              Renders the plugin's sidebar panel. Loaded when the pane is first rendered.
            </p>
            <Sig>{`interface Pane {
  mount: Mount;
  fit?: 'content';
}

function definePane(p: Pane): Pane;
function definePane(body: { mount: Mount }, rest: Omit<Pane, 'mount'>): Pane;`}</Sig>
            <p className={styles.para}>Example:</p>
            <File
              name="src/pane.tsx"
              language="tsx"
            >{`export default definePane(fromReact(RecentProteins), { fit: 'content' });`}</File>
            <Params
              heading="Pane properties"
              rows={[
                {
                  name: 'mount',
                  required: true,
                  type: 'Mount',
                  description: (
                    <>
                      As for <Code>route</Code>. <Code>ctx.panel.path</Code> is <Code>''</Code>, and{' '}
                      <Code>navigate</Code> is a no-op.
                    </>
                  ),
                },
                {
                  name: 'fit',
                  type: "'content'",
                  description:
                    "Sizes the panel to its content instead of sharing the sidebar's height. For toolbars and status panels.",
                },
              ]}
            />
            <p className={styles.para}>
              A plugin with a pane is pinned to the sidebar from Settings. The suggestion provider
              receives a <Code>Show Function Junction</Code> call for it, which runs{' '}
              <Code>workbench:show</Code>: that focuses a pinned pane, or previews an unpinned one
              in a temporary sidebar panel that a reload discards. Folding the pane unmounts it;
              unfolding mounts it again. Collapsing the sidebar keeps it mounted, and the sidebar
              icon opens the same panel in a flyout.
            </p>
          </Entry>

          <Entry id="r-commands" name="commands">
            <p className={styles.para}>
              Implements the slash commands the manifest declares. Loaded the first time one of the
              plugin's commands runs.
            </p>
            <Sig>{`interface CommandContext {
  host: PluginHost;
  caller: string;
}

type CommandHandler = (args: Record<string, string>, ctx: CommandContext) => void | Promise<void>;
type Commands = Record<string, CommandHandler>;

function defineCommands(handlers: Commands): Commands;`}</Sig>
            <p className={styles.para}>Example:</p>
            <File name="src/commands.ts" language="typescript">{`export default defineCommands({
  open: ({ q }, { host }) => host.openRoute(\`/\${q ?? ''}\`),
  compare: async ({ taxid }, { host }) => {
    if (!host.hasCommand('genknown:taxon')) return host.notify('genKnown is not installed.');
    await host.execute('genknown:taxon', { q: taxid });
  },
});`}</File>
            <Export id="r-handler" name="handler">
              <p className={styles.para}>
                Runs the command. Called each time the command runs, under the key matching the
                declared name.
              </p>
              <Params
                rows={[
                  {
                    name: 'args',
                    required: true,
                    type: 'Record<string, string>',
                    description:
                      'Argument values by name. From the prompt bar, tokens are bound by position; double quotes group a token with spaces; values are passed as typed. From execute, a command call or a cart item source, values are passed by name.',
                  },
                  {
                    name: 'ctx.host',
                    required: true,
                    type: 'PluginHost',
                    description: 'The host API.',
                  },
                  {
                    name: 'ctx.caller',
                    required: true,
                    type: 'string',
                    description: (
                      <>
                        <Code>'user'</Code> when run from the prompt bar, a keybinding, a menu, a
                        button or a row; otherwise the id of the plugin whose <Code>execute</Code>{' '}
                        ran it. Set by the workbench.
                      </>
                    ),
                  },
                ]}
              />
              <Returns>
                Nothing, or a promise. If the handler throws and the command was run from the UI, a
                toast titled <Code>/compare failed</Code> shows the message. If it was run through{' '}
                <Code>execute</Code>, the promise rejects with the error. A declared command with no
                handler fails with{' '}
                <Code>plugin function-junction declares /compare but does not implement it</Code>.
              </Returns>
            </Export>
          </Entry>

          <Entry id="r-prompt" name="prompt">
            <p className={styles.para}>
              Makes the plugin an assistant. Loaded when the plugin is selected as the assistant in
              Settings.
            </p>
            <Sig>{`interface Query {
  text: string;
  terms: string[];
  signal: AbortSignal;
}

interface Destination {
  label: string;
  path?: string;
  options?: { key: string; label: string }[];
  select?: (key: string) => void;
}

interface Prompt {
  handle: (q: Query, ctx: { host: PluginHost; attachments: readonly CartItem[] }) => Promise<void>;
  newConversation: (ctx: { host: PluginHost }) => void | Promise<void>;
  destination?: Subscribe<Destination | null>;
}

function definePrompt(p: Prompt): Prompt;`}</Sig>
            <p className={styles.para}>Example:</p>
            <File name="src/prompt.ts" language="typescript">{`export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    koros.steer(slug, text, attachments);
    host.openRoute(\`/\${slug}\`);
  },
  newConversation: ({ host }) => host.openRoute(\`/\${koros.newArc().slug}\`),
  destination: (set) => {
    const push = () => set(koros.destination());
    push();
    return koros.subscribe(push);
  },
});`}</File>
            <Export id="r-handle" name="handle">
              <p className={styles.para}>
                Receives a submitted message. Called when the user submits free text.
              </p>
              <Params
                rows={[
                  {
                    name: 'q.text',
                    required: true,
                    type: 'string',
                    description:
                      'The message. Never blank: the prompt bar rejects an empty submission.',
                  },
                  {
                    name: 'q.terms',
                    required: true,
                    type: 'string[]',
                    description: 'The terms extracted from the text.',
                  },
                  {
                    name: 'q.signal',
                    required: true,
                    type: 'AbortSignal',
                    description: 'Aborted when the user clicks Stop or submits another message.',
                  },
                  {
                    name: 'ctx.host',
                    required: true,
                    type: 'PluginHost',
                    description: 'The host API.',
                  },
                  {
                    name: 'ctx.attachments',
                    required: true,
                    type: 'readonly CartItem[]',
                    description: (
                      <>
                        The entire cart at submission, every plugin's items, each with{' '}
                        <Code>plugin</Code> set. The cart is cleared on submission.
                      </>
                    ),
                  },
                ]}
              />
              <Returns>
                A promise. The plugin renders the response itself, usually by opening its page with{' '}
                <Code>host.openRoute</Code>. If the promise rejects, the message is shown under the
                input, and the text and the attachments are restored unless a newer message was
                submitted.
              </Returns>
            </Export>
            <Export id="r-newConversation" name="newConversation">
              <p className={styles.para}>
                Starts a new conversation. Called when the user chooses New in the destination menu
                above the prompt bar.
              </p>
              <Params
                rows={[
                  {
                    name: 'ctx.host',
                    required: true,
                    type: 'PluginHost',
                    description: 'The host API.',
                  },
                ]}
              />
              <Returns>Nothing, or a promise.</Returns>
            </Export>
            <Export id="r-destination" name="destination">
              <p className={styles.para}>
                Publishes where the next message goes. Called once, when the module loads, with a
                setter. The prompt bar shows the current destination above the input.
              </p>
              <Params
                rows={[
                  {
                    name: 'set',
                    required: true,
                    type: '(value: Destination | null) => void',
                    description: (
                      <>
                        Replaces the destination. <Code>null</Code> shows "New conversation". An
                        invalid value is discarded, a warning is logged, and the previous
                        destination stays.
                      </>
                    ),
                  },
                ]}
              />
              <Returns>
                A cleanup function. It runs when another assistant is selected, and the destination
                is discarded.
              </Returns>
              <Params
                heading="Destination properties"
                rows={[
                  {
                    name: 'label',
                    required: true,
                    type: 'string',
                    description: 'The destination text.',
                  },
                  {
                    name: 'path',
                    type: 'string',
                    description: "The plugin's page for it. The bar shows a link that opens it.",
                  },
                  {
                    name: 'options',
                    type: '{ key: string; label: string }[]',
                    description:
                      'Alternative destinations, shown as a menu when select is also set.',
                  },
                  {
                    name: 'select',
                    type: '(key: string) => void',
                    description: 'Called with the chosen key.',
                  },
                ]}
              />
            </Export>
          </Entry>

          <Entry id="r-intent" name="intent">
            <p className={styles.para}>
              Makes the plugin a suggestion provider. Loaded at startup for every plugin that has
              one; only the plugin selected in Settings is asked for suggestions.
            </p>
            <Sig>{`type ContextTier = 'typed' | 'page' | 'cart';
type TieredTerms = Record<ContextTier, string[]>;

type DeclaredCommand = SlashCommand & { plugin: string; pluginTitle: string };

interface DeclaredCall extends CommandCall {
  plugin: string;
  pluginTitle: string;
  description?: string;
}

interface IntentQuery {
  text: string;
  terms: TieredTerms;
  offers: Offer[];
  signal: AbortSignal;
}

interface Suggestion {
  call: CommandCall;
  plugin?: string;
  detail?: string;
  score: number;
}

interface Intent {
  index: (commands: DeclaredCommand[], calls: DeclaredCall[]) => void;
  suggest: (q: IntentQuery) => Suggestion[] | Promise<Suggestion[]>;
}

function defineIntent(i: Intent): Intent;`}</Sig>
            <p className={styles.para}>Example:</p>
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
            <Export id="r-index" name="index">
              <p className={styles.para}>
                Receives the command catalog. Called once, when the module loads. The installed set
                does not change during a session.
              </p>
              <Params
                rows={[
                  {
                    name: 'commands',
                    required: true,
                    type: 'DeclaredCommand[]',
                    description:
                      "Every installed plugin's commands as declared, each with its plugin's id and title.",
                  },
                  {
                    name: 'calls',
                    required: true,
                    type: 'DeclaredCall[]',
                    description: (
                      <>
                        Every command call from the manifests: each launcher, each shortcut, and one{' '}
                        <Code>workbench:show</Code> per plugin with a pane. A call runs as declared;
                        typed text fills nothing in it.
                      </>
                    ),
                  },
                ]}
              />
              <Returns>Nothing.</Returns>
            </Export>
            <Export id="r-suggest" name="suggest">
              <p className={styles.para}>
                Ranks suggestions for free text. Called on every change to free text, again when a
                plugin's <Code>offer</Code> resolves asynchronously, and again when the active tab's
                or the cart's terms change while text is in the bar.
              </p>
              <Params
                rows={[
                  {
                    name: 'q.text',
                    required: true,
                    type: 'string',
                    description: 'The prompt bar text.',
                  },
                  {
                    name: 'q.terms',
                    required: true,
                    type: 'TieredTerms',
                    description: (
                      <>
                        Terms grouped by context tier: <Code>typed</Code> from the text,{' '}
                        <Code>page</Code> from the active tab, <Code>cart</Code> from the cart's
                        items. The page and cart tiers are disjoint; the typed tier may repeat
                        either.
                      </>
                    ),
                  },
                  {
                    name: 'q.offers',
                    required: true,
                    type: 'Offer[]',
                    description: "Every plugin's offers for the text, each command qualified.",
                  },
                  {
                    name: 'q.signal',
                    required: true,
                    type: 'AbortSignal',
                    description: 'Aborted when the query changes.',
                  },
                ]}
              />
              <Returns>
                An array of <Code>Suggestion</Code>, or a promise of one. Each suggestion is
                validated; an invalid one is discarded and a warning is logged. The prompt bar
                displays the first four in the order returned, below a first row that submits the
                text to the assistant. Previous rows stay until the next result arrives. A result
                for an outdated query is discarded. A thrown error or rejection is logged and the
                previous rows stay. While no provider is loaded, no rows are shown and Enter submits
                the text.
              </Returns>
              <Params
                heading="Suggestion properties"
                rows={[
                  {
                    name: 'call',
                    required: true,
                    type: 'CommandCall',
                    description: 'The row. Its command is qualified as plugin:name.',
                  },
                  {
                    name: 'plugin',
                    type: 'string',
                    description:
                      "The plugin whose icon the row shows, when it is not the command's plugin.",
                  },
                  {
                    name: 'detail',
                    type: 'string',
                    description: "Caption text, in place of the plugin's title.",
                  },
                  {
                    name: 'score',
                    required: true,
                    type: 'number',
                    description: 'Higher ranks higher. Rows are displayed in the order returned.',
                  },
                ]}
              />
              <p className={styles.para}>
                The bundled provider scores each declaration against the text by character n-gram
                cosine similarity, with identifiers in the text replaced by the name of their type.
                It drops rows without an offer below a score of 0.2, binds identifiers to arguments
                by the similarity between the identifier's type and the argument's name and
                description, boosts offered rows by the weight of <Code>match.kind</Code> times the
                weight of the term's context tier, and drops rows with an unfilled required
                argument.
              </p>
            </Export>
          </Entry>

          <Entry id="r-host" name="Host API">
            <p className={styles.para}>
              What a plugin can ask the workbench to do. Passed to every mount, command handler and
              prompt handler as <Code>ctx.host</Code>; in React, read with <Code>useHost()</Code>.
            </p>
            <Sig>{`interface PluginHost {
  openRoute: (path: string, options?: { duplicate?: boolean }) => void;
  execute: (command: string, args?: Record<string, string>) => Promise<void>;
  hasCommand: (command: string) => boolean;
  notify: (text: string) => void;
  cart: Cart;
  frames: FrameLayer;
}`}</Sig>
            <Export id="r-openRoute" name="openRoute">
              <p className={styles.para}>Opens this plugin's page at a path.</p>
              <Params
                rows={[
                  {
                    name: 'path',
                    required: true,
                    type: 'string',
                    description: 'The path, including any query string.',
                  },
                  {
                    name: 'options.duplicate',
                    type: 'boolean',
                    description: 'When true, opens a new tab without checking for an existing one.',
                  },
                ]}
              />
              <Returns>
                Nothing. If an open tab of the plugin has a path with the same{' '}
                <Code>normalize</Code> result, that tab is focused; otherwise a new tab opens. If{' '}
                <Code>path</Code> is not a string, a <Code>TypeError</Code> is thrown. If the route
                module fails to load, the failure is announced and no tab opens.
              </Returns>
            </Export>
            <Export id="r-execute" name="execute">
              <p className={styles.para}>Runs a command.</p>
              <Params
                rows={[
                  {
                    name: 'command',
                    required: true,
                    type: 'string',
                    description: (
                      <>
                        <Code>name</Code> for this plugin's own command, or <Code>plugin:name</Code>
                        .
                      </>
                    ),
                  },
                  {
                    name: 'args',
                    type: 'Record<string, string>',
                    description: 'Argument values by name.',
                  },
                ]}
              />
              <Returns>
                A promise that resolves when the handler resolves, with no value. It rejects with a{' '}
                <Code>TypeError</Code> if an argument value is not a string, with{' '}
                <Code>unknown command /genknown:taxon</Code> if no command is registered under the
                name, and with the handler's error if the handler throws. The handler receives this
                plugin's id as <Code>caller</Code>.
              </Returns>
            </Export>
            <Export id="r-hasCommand" name="hasCommand">
              <p className={styles.para}>Reports whether a command is registered.</p>
              <Params
                rows={[
                  {
                    name: 'command',
                    required: true,
                    type: 'string',
                    description: 'As for execute.',
                  },
                ]}
              />
              <Returns>
                <Code>true</Code> if a command is registered under the qualified name.
              </Returns>
            </Export>
            <Export id="r-notify" name="notify">
              <p className={styles.para}>Shows a toast.</p>
              <Params
                rows={[
                  {
                    name: 'text',
                    required: true,
                    type: 'string',
                    description: 'The toast title. Must be non-empty.',
                  },
                ]}
              />
              <Returns>
                Nothing. If <Code>text</Code> is empty or not a string, a <Code>TypeError</Code> is
                thrown.
              </Returns>
            </Export>
            <p className={styles.para}>
              <Code>cart</Code> is the cart API below. <Code>frames</Code> is the frame layer used
              by <Code>AppFrame</Code>.
            </p>
          </Entry>

          <Entry id="r-panel" name="Panel API">
            <p className={styles.para}>
              What a panel knows about itself and can change. Passed to <Code>mount</Code> as{' '}
              <Code>ctx.panel</Code>; in React, read with <Code>usePanel()</Code>.
            </p>
            <Sig>{`interface Crumb {
  label: string;
  path?: string;
  icon?: string;
}

interface PanelHandle {
  id: string;
  plugin: string;
  kind: 'route' | 'pane';
  path: string;
  focused: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setTitle: (title: string) => void;
  setCrumbs: (crumbs: Crumb[]) => void;
  setTerms: (terms: string[]) => void;
  subscribe: (listener: () => void) => Cleanup;
}`}</Sig>
            <Params
              heading="Properties"
              rows={[
                {
                  name: 'id',
                  type: 'string',
                  description: "Opaque. Stable for the panel's lifetime.",
                },
                { name: 'plugin', type: 'string', description: "The plugin's id." },
                { name: 'kind', type: "'route' | 'pane'", description: 'Page or sidebar panel.' },
                {
                  name: 'path',
                  type: 'string',
                  description: (
                    <>
                      Everything after <Code>/p/&lt;plugin&gt;</Code> in the tab URL, including the
                      query string. <Code>''</Code> for a pane. Read live.
                    </>
                  ),
                },
                {
                  name: 'focused',
                  type: 'boolean',
                  description: 'Whether this panel is the focused panel. Read live.',
                },
              ]}
            />
            <Params
              heading="Methods"
              rows={[
                {
                  name: 'navigate(path, options?)',
                  type: 'void',
                  description: (
                    <>
                      Changes the tab's path. In the focused tab this pushes a history entry, or
                      replaces it when <Code>options.replace</Code> is true. A no-op for panes.
                      Throws a <Code>TypeError</Code> if <Code>path</Code> is not a string.
                    </>
                  ),
                },
                {
                  name: 'setTitle(title)',
                  type: 'void',
                  description: (
                    <>
                      Sets the tab or panel title. Throws a <Code>TypeError</Code> if{' '}
                      <Code>title</Code> is not a string.
                    </>
                  ),
                },
                {
                  name: 'setCrumbs(crumbs)',
                  type: 'void',
                  description: (
                    <>
                      Sets the breadcrumbs shown above the panel. Clicking a crumb with a{' '}
                      <Code>path</Code> navigates this panel there. The tab strip also uses
                      breadcrumbs to distinguish two tabs with the same title. Throws a{' '}
                      <Code>TypeError</Code> if a crumb is invalid.
                    </>
                  ),
                },
                {
                  name: 'setTerms(terms)',
                  type: 'void',
                  description: (
                    <>
                      Declares what the panel is about. While the tab is active, the terms are
                      queried against every other plugin's <Code>relate</Code> and passed to{' '}
                      <Code>suggest</Code> under the <Code>page</Code> tier. Throws a{' '}
                      <Code>TypeError</Code> if <Code>terms</Code> is not an array of strings.
                    </>
                  ),
                },
                {
                  name: 'subscribe(listener)',
                  type: 'Cleanup',
                  description:
                    "Calls listener when this panel's path or focus changes. Returns an unsubscribe function.",
                },
              ]}
            />
          </Entry>

          <Entry id="r-cart" name="Cart API">
            <p className={styles.para}>
              This plugin's view of the cart. Available as <Code>host.cart</Code>; in React, read
              with <Code>useCart()</Code>.
            </p>
            <Sig>{`interface Cart {
  add: (item: Omit<CartItem, 'plugin'>) => void;
  remove: (id: string) => void;
  items: () => readonly CartItem[];
  has: (id: string) => boolean;
  count: () => number;
  subscribe: (listener: () => void) => Cleanup;
}

interface CartItem {
  id: string;
  readonly plugin?: string;
  name: string;
  subject?: string;
  summary?: string;
  terms?: string[];
  answers?: Match[];
  source?: CartSource;
  context?: Record<string, unknown>;
}

interface CartSource {
  command: string;
  args?: Record<string, string>;
}`}</Sig>
            <Params
              heading="Methods"
              rows={[
                {
                  name: 'add(item)',
                  type: 'void',
                  description: (
                    <>
                      Adds an item. The workbench sets <Code>plugin</Code> to this plugin's id,
                      overriding any value passed. An item with the same <Code>id</Code> is
                      replaced. Throws a <Code>TypeError</Code> naming the failing field if the item
                      is invalid:{' '}
                      <Code>plugin fj: cart.add refused the item — source.command: …</Code>.
                    </>
                  ),
                },
                {
                  name: 'remove(id)',
                  type: 'void',
                  description: 'Removes the item if this plugin added it.',
                },
                {
                  name: 'items()',
                  type: 'readonly CartItem[]',
                  description: "This plugin's items.",
                },
                {
                  name: 'has(id)',
                  type: 'boolean',
                  description: 'Whether this plugin added an item with the id.',
                },
                {
                  name: 'count()',
                  type: 'number',
                  description: "The number of this plugin's items.",
                },
                {
                  name: 'subscribe(listener)',
                  type: 'Cleanup',
                  description:
                    "Calls listener on any plugin's change to the cart. Returns an unsubscribe function.",
                },
              ]}
            />
            <Params
              heading="CartItem properties"
              rows={[
                {
                  name: 'id',
                  required: true,
                  type: 'string',
                  description: (
                    <>
                      Unique across plugins. Derived from the identity of the thing, as{' '}
                      <Code>function-junction:protein:P0AEX9</Code>, so adding it twice replaces
                      rather than duplicates.
                    </>
                  ),
                },
                {
                  name: 'plugin',
                  type: 'string',
                  description: 'Set by the workbench when the item enters the cart. Read-only.',
                },
                {
                  name: 'name',
                  required: true,
                  type: 'string',
                  description: 'What the user calls the item.',
                },
                {
                  name: 'subject',
                  type: 'string',
                  description:
                    'The identifier the item is about. Shown first on the tile and the Related row.',
                },
                { name: 'summary', type: 'string', description: 'One line.' },
                {
                  name: 'terms',
                  type: 'string[]',
                  description:
                    "Namespaced identifiers. Once the item is in the cart, they are queried against other plugins' relate.",
                },
                {
                  name: 'answers',
                  type: 'Match[]',
                  description:
                    'On an item returned by relate: which of the queried terms the item answers, and how. Shown as the reason on the Related row; not stored in the cart.',
                },
                {
                  name: 'source',
                  type: 'CartSource',
                  description:
                    'A command that reproduces the item: the bare name of one of the adding plugin’s commands, with arguments. Any holder of the item can run it.',
                },
                {
                  name: 'context',
                  type: 'Record<string, unknown>',
                  description:
                    'What an assistant should know about the item: units, population, caveats. Kept small; it goes into a prompt.',
                },
              ]}
            />
            <p className={styles.para}>
              A cart item is a reference, not a payload. A consumer fetches the underlying data
              through <Code>terms</Code> and <Code>source</Code>.
            </p>
          </Entry>

          <Entry id="r-react" name="React">
            <p className={styles.para}>
              Hooks and components for a panel rendered with <Code>fromReact</Code>. The hooks throw{' '}
              <Code>usePanel() called outside a workbench panel</Code>, or the <Code>useHost</Code>{' '}
              equivalent, when rendered outside the SDK's providers.
            </p>
            <Sig>{`function fromReact(Component: ComponentType): { mount: Mount };

function useHost(): PluginHost;
function usePanel(): PanelHandle;
function useCart(): Cart;
function usePanelTitle(title: string): void;
function usePanelBreadcrumbs(crumbs: Crumb[]): void;
function usePanelTerms(terms: string[]): void;

interface CartButtonProps {
  item: CartItem;
  labelled?: boolean;
  className?: string;
  disabled?: boolean;
}

function CartButton(props: CartButtonProps): JSX.Element;`}</Sig>
            <Params
              heading="Functions"
              rows={[
                {
                  name: 'fromReact(Component)',
                  type: '{ mount }',
                  description:
                    'Wraps a component as a mount. Creates a React root in the mount element, provides the panel and host contexts, and re-renders when the path or focus changes. A component that throws during render is replaced by "This panel crashed" with a Try again button that re-renders it.',
                },
                { name: 'useHost()', type: 'PluginHost', description: 'The host API.' },
                {
                  name: 'usePanel()',
                  type: 'PanelHandle',
                  description: "The panel API. Re-renders on this panel's path and focus changes.",
                },
                {
                  name: 'useCart()',
                  type: 'Cart',
                  description: "The cart API. Re-renders when this plugin's items change.",
                },
                {
                  name: 'usePanelTitle(title)',
                  type: 'void',
                  description: 'Sets the title in an effect.',
                },
                {
                  name: 'usePanelBreadcrumbs(crumbs)',
                  type: 'void',
                  description: 'Sets the breadcrumbs in an effect, compared by value.',
                },
                {
                  name: 'usePanelTerms(terms)',
                  type: 'void',
                  description: 'Sets the terms in an effect, compared by value.',
                },
                {
                  name: 'CartButton',
                  type: 'component',
                  description: (
                    <>
                      The design system's cart button bound to this plugin's cart. Pressed while{' '}
                      <Code>item.id</Code> is in the cart; clicking adds or removes the item.{' '}
                      <Code>labelled</Code> shows the label text instead of the icon-only pill.
                    </>
                  ),
                },
              ]}
            />
          </Entry>

          <Entry id="r-frame" name="AppFrame">
            <p className={styles.para}>
              Embeds an application in an iframe that survives layout changes. Rendered by a page or
              pane; the iframe is created once and kept for the panel's lifetime.
            </p>
            <Sig>{`interface AppFrameProps {
  src: string;
  title: string;
  ref?: Ref<HTMLIFrameElement>;
}

function AppFrame(props: AppFrameProps): ReactElement;

interface FrameLayer {
  container: HTMLElement;
  attach: (frame: HTMLElement, placeholder: HTMLElement) => Cleanup;
}`}</Sig>
            <Params
              heading="Props"
              rows={[
                {
                  name: 'src',
                  required: true,
                  type: 'string',
                  description: 'The iframe URL. Changing it reloads the app.',
                },
                { name: 'title', required: true, type: 'string', description: 'The iframe title.' },
                {
                  name: 'ref',
                  type: 'Ref<HTMLIFrameElement>',
                  description: (
                    <>
                      The iframe element, for <Code>postMessage</Code> to its{' '}
                      <Code>contentWindow</Code> and for matching a message's <Code>source</Code>.
                    </>
                  ),
                },
              ]}
            />
            <p className={styles.para}>
              Browsers reload an iframe that is moved in the DOM, and a panel is moved when its tab
              changes group or its pane moves between the sidebar and the main area.{' '}
              <Code>AppFrame</Code> renders the iframe into a fixed layer at the end of the document
              and positions it over a placeholder inside the panel. The placeholder moves with the
              panel; the iframe follows without being moved. The iframe fills the placeholder.
              Messaging between the panel and the embedded app is the plugin's own protocol.{' '}
              <Code>FrameLayer</Code> is <Code>host.frames</Code>, for a non-React panel that
              attaches its own iframe with <Code>attach(frame, placeholder)</Code>.
            </p>
          </Entry>

          <Entry id="r-vite" name="pluginFederation">
            <p className={styles.para}>
              Builds the plugin as a Module Federation remote. Used in the plugin's{' '}
              <Code>vite.config.ts</Code>.
            </p>
            <Sig>{`function pluginFederation(options: {
  config: PluginConfig;
  background?: string;
  route?: string;
  pane?: string;
  commands?: string;
  prompt?: string;
  intent?: string;
}): Plugin[];`}</Sig>
            <Params
              rows={[
                {
                  name: 'options.config',
                  required: true,
                  type: 'PluginConfig',
                  description: 'The manifest exported by plugin.config.ts.',
                },
                {
                  name: 'options.<module>',
                  type: 'string',
                  description:
                    'The entry file for each module the plugin provides. Only the files named here are part of the plugin.',
                },
              ]}
            />
            <Returns>
              Vite plugins. During <Code>vite build</Code>, each named file is exposed as a
              federation module under its module name, and <Code>manifest.json</Code> is emitted
              next to <Code>remoteEntry.js</Code> with <Code>modules</Code> set to the names.{' '}
              <Code>react</Code>, <Code>react-dom</Code>, <Code>zod</Code>,{' '}
              <Code>@phosphor-icons/react</Code>, <Code>@tanstack/react-router</Code>,{' '}
              <Code>@kbase/design-system</Code> and <Code>@kbase/plugin-sdk</Code> are configured as
              shared singletons provided by the host, regardless of the plugin's{' '}
              <Code>package.json</Code>: they are excluded from the bundle and resolved at runtime
              to the workbench's instances.
            </Returns>
          </Entry>
        </Part>

        <Part id="deploying" title="Deployment">
          <p className={styles.narrative}>
            In production a plugin is a static bundle served next to its backend. The workbench
            fetches it from three routes on the workbench's own origin.
          </p>
          <Table
            head={['Route', 'Served by', 'Content']}
            rows={[
              [
                <Code>/services/&lt;id&gt;/manifest.json</Code>,
                "the plugin's service",
                'the manifest',
              ],
              [
                <Code>/services/&lt;id&gt;/plugin/*</Code>,
                "the plugin's service",
                <>
                  the contents of <Code>dist/</Code>
                </>,
              ],
              [<Code>/plugin-registry/plugins</Code>, 'a registry', 'a JSON array of manifests'],
            ]}
          />
          <Explainer>
            <p className={styles.para}>
              The workbench fetches the registry once at startup and derives the other two routes
              from each manifest's <Code>id</Code>. A deployment routes the three paths to the
              plugin services and the registry in front of the workbench image. Because every fetch
              is same-origin, the remote entries satisfy the page's <Code>script-src 'self'</Code>{' '}
              policy. The workbench image itself serves its HTML shell for{' '}
              <Code>/plugin-registry/plugins</Code>; the workbench treats a non-JSON response as "no
              registry", logs <Code>plugin registry unavailable; using bundled plugins only</Code>,
              and runs its bundled plugins alone. In development, the dev server is the registry for
              the services listed in <Code>VITE_DEV_SERVICE_PROXY</Code>.
            </p>
          </Explainer>
        </Part>

        <Part id="errors" title="Troubleshooting">
          <div className={styles.trouble}>
            <Symptom name="The plugin does not appear">
              Settings lists every installed plugin under Installed and every rejected manifest
              under Not loaded, with the reason. An incompatible <Code>sdkVersion</Code> is the
              usual reason; rebuild against the SDK the workbench serves. A plugin in neither list
              is missing from <Code>/plugin-registry/plugins</Code>: the registry or the dev proxy
              cannot reach the service, or the service returns non-JSON for its manifest. A plugin
              listed in Settings but absent from Home has no <Code>launcher</Code>.
            </Symptom>
            <Symptom name="The tab is titled Hello: /Alice">
              The panel has not set a title. Call <Code>usePanelTitle</Code> or{' '}
              <Code>setTitle</Code>.
            </Symptom>
            <Symptom name="A second tab opens for a page that is already open">
              <Code>normalize</Code> returns different strings for the two paths, or the caller
              passed <Code>duplicate: true</Code>.
            </Symptom>
            <Symptom name="Invalid hook call, or a context that is always null">
              The bundle includes its own copy of React or of the SDK. <Code>mf-manifest.json</Code>{' '}
              in the build output lists the shared packages; a package missing there means{' '}
              <Code>pluginFederation</Code> did not process that entry point.
            </Symptom>
            <Symptom name="usePanel() called outside a workbench panel">
              The component rendered outside the React root <Code>fromReact</Code> created, usually
              inside a second <Code>createRoot</Code>. Pass the handle to such components as a prop.
              Context passes through portals, so <Code>AppFrame</Code> reads it from inside one.
            </Symptom>
            <Symptom name="A command runs, then fails">
              The toast gives the reason: <Code>vite.config.ts</Code> does not name{' '}
              <Code>commands</Code>, the module has no handler with that name, or the handler threw.
            </Symptom>
            <Symptom name="The plugin's offers never appear">
              Check that <Code>background</Code> is named in <Code>vite.config.ts</Code>, that the
              console shows no load failure for it, and that <Code>terms</Code> returns a term that{' '}
              <Code>offer</Code> handles. Offers are displayed only through the selected suggestion
              provider.
            </Symptom>
            <Symptom name="The panel shows an alert instead of the plugin">
              "Could not be loaded" with Try again is a load failure;{' '}
              <Code>exposed nothing at ./route</Code> under Details means the file has no default
              export. "This panel crashed" with Restart panel means <Code>mount</Code> threw; with
              Try again, the component threw during render. The error message is under Details.
            </Symptom>
          </div>
        </Part>
      </article>
    </div>
  );
}

const SECTIONS: { id: string; label: string; children?: { id: string; label: string }[] }[] = [
  { id: 'concepts', label: 'Concepts and usage' },
  { id: 'start', label: 'Getting started' },
  { id: 'anatomy', label: 'Anatomy of a plugin' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'manifest', label: 'Manifest reference' },
  {
    id: 'reference',
    label: 'API reference',
    children: [
      { id: 'r-background', label: 'background' },
      { id: 'r-route', label: 'route' },
      { id: 'r-pane', label: 'pane' },
      { id: 'r-commands', label: 'commands' },
      { id: 'r-prompt', label: 'prompt' },
      { id: 'r-intent', label: 'intent' },
      { id: 'r-host', label: 'Host API' },
      { id: 'r-panel', label: 'Panel API' },
      { id: 'r-cart', label: 'Cart API' },
      { id: 'r-react', label: 'React' },
      { id: 'r-frame', label: 'AppFrame' },
      { id: 'r-vite', label: 'pluginFederation' },
    ],
  },
  { id: 'deploying', label: 'Deployment' },
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

// A tutorial step: a heading, then prose and code.
function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.step}>
      <h3 className={styles.stepName}>{title}</h3>
      {children}
    </section>
  );
}

// One reference entry: name, description, signature, example, members.
function Entry({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  return (
    <section className={styles.entry} id={id} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className={styles.entryName}>
        {name}
      </h3>
      {children}
    </section>
  );
}

// One member of an entry: a method, a callback or a property group.
function Export({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  return (
    <section className={styles.export} id={id} aria-labelledby={`${id}-h`}>
      <h4 id={`${id}-h`} className={styles.exportName}>
        {name}
      </h4>
      {children}
    </section>
  );
}

interface ParamRow {
  name: string;
  description: ReactNode;
  type: string;
  required?: boolean;
}

// Name | Description | Type. A trailing * marks a required parameter.
function Params({ rows, heading = 'Parameters' }: { rows: ParamRow[]; heading?: string }) {
  return (
    <div className={styles.block}>
      <h5 className={styles.subhead}>{heading}</h5>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
            <th scope="col">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                {r.name}
                {r.required && <span className={styles.required}>*</span>}
              </td>
              <td>{r.description}</td>
              <td>
                <Code>{r.type}</Code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Returns({ children }: { children: ReactNode }) {
  return (
    <div className={styles.block}>
      <h5 className={styles.subhead}>Returns</h5>
      <p className={styles.para}>{children}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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

// The detailed rules of a section, after its overview paragraph.
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
