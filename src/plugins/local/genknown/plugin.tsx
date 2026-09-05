import {
  AppFrame,
  definePlugin,
  usePanel,
  usePanelBreadcrumbs,
  usePanelTitle,
} from '@kbase/plugin-sdk';
import type { Crumb } from '@kbase/plugin-sdk';

const VIEWS: Record<string, string> = {
  genome: 'Genome',
  annotations: 'Annotations',
  taxon: 'Taxonomy',
  organism: 'Genomes',
  pangenome: 'Pangenome',
  blast: 'Sequence match',
  marker: 'Marker genes',
};

// GenKnown reads a genome as belonging to an organism, so the organism is
// the step above it when both are known.
function trail(params: Record<string, string>): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Genomes', action: {} }];
  if (params.organism)
    crumbs.push({
      label: params.organism,
      action: { view: 'organism', organism: params.organism },
    });
  const subject = params.assembly ?? params.ref ?? params.taxon;
  if (subject) crumbs.push({ label: subject, action: { view: 'genome', assembly: subject } });
  else if (params.q) crumbs.push({ label: `"${params.q}"` });
  const view = VIEWS[params.view ?? ''];
  if (view && subject) crumbs.push({ label: view });
  return crumbs;
}

// An app is a page of its own; the plugin is the frame around it. The
// panel's params are the action an offer asked for, so they ride into
// the page as its query — the app, not the host, decides what they mean.
function AppDocument() {
  const { params } = usePanel();
  const query = new URLSearchParams(params).toString();
  const subject = params.q ?? params.accession ?? params.gene ?? params.organism ?? params.assembly;
  usePanelTitle(subject ?? 'GenKnown');
  usePanelBreadcrumbs(trail(params));
  return <AppFrame src={`/mock-apps/genknown.html${query ? `?${query}` : ''}`} title="GenKnown" />;
}

export default definePlugin({ document: AppDocument });
