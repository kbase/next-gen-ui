import {
  AppFrame,
  definePlugin,
  usePanel,
  usePanelBreadcrumbs,
  usePanelTitle,
} from '@kbase/plugin-sdk';
import type { Crumb } from '@kbase/plugin-sdk';

// The views this app can be opened at, in the words it uses for them.
const VIEWS: Record<string, string> = {
  dossier: 'Evidence',
  structure: 'Structure',
  ortholog: 'Orthologs',
  fitness: 'Fitness',
  domain: 'Domains',
  literature: 'Literature',
  reaction: 'Reactions',
  identify: 'Identification',
  search: 'Results',
};

// Where the panel sits, in this app's own terms. The subject is a crumb
// of its own so that going back to it means the whole protein rather than
// one view of it; the view is the last step and links nowhere.
function trail(params: Record<string, string>): Crumb[] {
  const subject = params.accession ?? params.gene ?? params.pfam ?? params.interpro ?? params.ko;
  const view = VIEWS[params.view ?? ''];
  const crumbs: Crumb[] = [{ label: 'Proteins', action: {} }];
  if (subject) crumbs.push({ label: subject, action: { view: 'dossier', accession: subject } });
  else if (params.q) crumbs.push({ label: `"${params.q}"` });
  if (view) crumbs.push({ label: view });
  return crumbs;
}

// An app is a page of its own; the plugin is the frame around it. The
// panel's params are the action an offer asked for, so they ride into
// the page as its query — the app, not the host, decides what they mean.
function AppDocument() {
  const { params } = usePanel();
  const query = new URLSearchParams(params).toString();
  const subject = params.q ?? params.accession ?? params.gene ?? params.organism ?? params.assembly;
  // The tab names the subject; the trail says where in the app you are.
  usePanelTitle(subject ?? 'Function Junction');
  usePanelBreadcrumbs(trail(params));
  return (
    <AppFrame
      src={`/mock-apps/function-junction.html${query ? `?${query}` : ''}`}
      title="Function Junction"
    />
  );
}

export default definePlugin({ document: AppDocument });
