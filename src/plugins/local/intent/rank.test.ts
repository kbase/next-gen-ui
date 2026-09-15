import { describe, expect, it } from 'vitest';
import type { DeclaredCall, DeclaredCommand, Offer, TieredTerms } from '@kbase/plugin-sdk';
import { MATCH_WEIGHT, TIER_WEIGHT, buildCommandIndex, rankCommands } from './rank';
import { tagText } from './tag';

const fj = { plugin: 'function-junction', pluginTitle: 'Function Junction' };
const gk = { plugin: 'genknown', pluginTitle: 'genKnown' };
const jobs = { plugin: 'jobs', pluginTitle: 'Jobs' };

const commands: DeclaredCommand[] = [
  {
    ...fj,
    name: 'open',
    title: 'Open the evidence dossier for a protein',
    args: [{ name: 'q', description: 'a UniProt or RefSeq id, a gene name, or a sequence' }],
  },
  {
    ...gk,
    name: 'open',
    title: 'Open the taxon dossier',
    args: [
      {
        name: 'q',
        description: 'a taxon name, NCBI taxid, FitnessBrowser orgId, or genome accession',
      },
    ],
  },
  {
    ...gk,
    name: 'compare',
    title: 'Compare two taxa',
    args: [
      { name: 'a', description: 'a taxon name or NCBI taxid' },
      { name: 'b', description: 'a taxon name or NCBI taxid' },
    ],
  },
  {
    ...jobs,
    name: 'cancel',
    title: 'Cancel a job',
    args: [{ name: 'id', required: true, description: 'job id' }],
    semantics: { description: 'Cancel, stop, kill or abort a running or queued job.' },
  },
  {
    ...jobs,
    name: 'open',
    title: 'Open a job',
    args: [{ name: 'id', required: true, description: 'job id' }],
  },
];

const index = buildCommandIndex(commands);
const NOTHING: TieredTerms = { typed: [], page: [], cart: [] };
// What the backgrounds found in the text, and nothing in view.
const rank = (text: string, typed: string[] = []) =>
  rankCommands(index, text, tagText(text), { ...NOTHING, typed });
// The same text with something on the page or in the cart.
const inView = (text: string, view: Partial<TieredTerms>) =>
  rankCommands(index, text, tagText(text), { ...NOTHING, ...view });

describe('ranking commands against typed text', () => {
  it('reads an accession as what it is and fills the argument', () => {
    const [top] = rank('I want a dossier for P0AEX9');
    expect(top.command).toBe('function-junction:open');
    expect(top.args).toEqual({ q: 'P0AEX9' });
  });

  it('lets the identifier decide between two dossiers', () => {
    const [top] = rank('dossier for taxon:562');
    expect(top.command).toBe('genknown:open');
    expect(top.args).toEqual({ q: '562' });
  });

  it('ranks by the semantics section, which no title carries', () => {
    const [top] = rank('kill the running job', ['job:12']);
    expect(top.command).toBe('jobs:cancel');
  });

  // A row runs when pressed, so a command with a required argument the text
  // does not fill is not a row.
  it('keeps a plugin offer whose letters say nothing, ranked by the letters', () => {
    const offer: Offer = {
      label: 'Dossier for P0AEX9',
      command: 'function-junction:open',
      args: { q: 'P0AEX9' },
      match: { term: 'uniprot:P0AEX9', kind: 'identifier' },
    };
    const rows = rankCommands(index, 'zzzz', tagText('zzzz'), NOTHING, [offer]);
    expect(rows.map((r) => r.command)).toEqual(['function-junction:open']);
  });

  it('offers a command only with its required arguments filled', () => {
    expect(rank('kill the running job')).toEqual([]);
    expect(rank('cancel this job', ['job:12'])[0]?.args).toEqual({ id: '12' });
  });

  it('binds a plugin-minted term through its prefix letters', () => {
    const [top] = rank('cancel this job', ['job:12']);
    expect(top.command).toBe('jobs:cancel');
    expect(top.args).toEqual({ id: '12' });
  });

  it('fills two arguments from two terms, in order', () => {
    const [top] = rank('compare taxon:562 with taxon:1423');
    expect(top.command).toBe('genknown:compare');
    expect(top.args).toEqual({ a: '562', b: '1423' });
  });

  it('leaves an argument empty rather than guess it', () => {
    const [top] = rank('protein dossier for job:12', ['job:12']);
    expect(top.command).toBe('function-junction:open');
    expect(top.args).toEqual({});
  });

  it('answers nothing for letters in common', () => {
    expect(rank('xq')).toEqual([]);
    expect(rank('what is the weather like')).toEqual([]);
  });

  // A fragment carries its own n-grams; one buried in "I want a" does not
  // clear the floor until the word is nearly whole.
  it('answers while a word is still being typed', () => {
    expect(rank('kill the runn', ['job:12'])[0]?.command).toBe('jobs:cancel');
    expect(rank('cancel jo', ['job:12'])[0]?.command).toBe('jobs:cancel');
  });

  it('shows at most four rows', () => {
    expect(rank('open').length).toBeLessThanOrEqual(4);
  });
});

describe('what the user has in view', () => {
  // The punchlist case: the accession is in the cart, "dossier" is typed, and
  // nobody was asked about the cart. The command is reachable only because
  // the ranker binds the argument from the tier the cart put the term in.
  it('fills an argument from a cart term the text does not carry', () => {
    const fjOpen = (rows: ReturnType<typeof rank>) =>
      rows.find((r) => r.command === 'function-junction:open');
    // The word reaches the command either way; on its own it opens nothing.
    expect(fjOpen(rank('dossier'))?.args).toEqual({});
    const row = fjOpen(inView('dossier', { cart: ['uniprot:P0AEX9'] }));
    expect(row?.args).toEqual({ q: 'P0AEX9' });
    expect(row?.evidence).toEqual({ term: 'uniprot:P0AEX9', kind: 'name', tier: 'cart' });
  });

  // A required argument is the sharpest form of it: the same text answers
  // nothing on its own and answers a command once the page carries the id.
  it('reaches a command the text alone cannot fill', () => {
    expect(rank('cancel this job')).toEqual([]);
    const [top] = inView('cancel this job', { page: ['job:12'] });
    expect(top.command).toBe('jobs:cancel');
    expect(top.args).toEqual({ id: '12' });
  });

  it('gives the argument to the typed term, not the one in the cart', () => {
    const [top] = inView('dossier for P0AEX9', { cart: ['uniprot:Q9XYZ1'] });
    expect(top.args).toEqual({ q: 'P0AEX9' });
    expect(top.evidence?.tier).toBe('typed');
  });

  it('weighs a typed term above the same term in the cart', () => {
    const typed = rank('cancel this job', ['job:12'])[0];
    const carted = inView('cancel this job', { cart: ['job:12'] })[0];
    expect(carted.command).toBe(typed.command);
    expect(carted.args).toEqual(typed.args);
    expect(typed.score).toBeGreaterThan(carted.score);
  });
});

describe('what plugins offered', () => {
  const offer: Offer = {
    label: 'Dossier for P0AEX9',
    command: 'function-junction:open',
    args: { q: 'P0AEX9' },
    match: { term: 'uniprot:P0AEX9', kind: 'identifier' },
  };
  const withOffers = (text: string, offers = [offer]) =>
    rankCommands(index, text, tagText(text), NOTHING, offers);

  it("is a row in the plugin's own words, lifted for the term it recognised", () => {
    const [top] = withOffers('P0AEX9');
    expect(top.command).toBe('function-junction:open');
    expect(top.label).toBe('Dossier for P0AEX9');
    expect(top.args).toEqual({ q: 'P0AEX9' });
    expect(top.score).toBeGreaterThan(rank('P0AEX9')[0]?.score ?? 0);
  });

  it('is ordered by the sentence, not by being an offer', () => {
    const taxon: Offer = {
      label: 'Taxon 562',
      command: 'genknown:open',
      args: { q: '562' },
      match: { term: 'ncbitaxon:562', kind: 'identifier' },
    };
    const [top, second] = withOffers('compare taxon:562 with taxon:1423', [taxon]);
    expect(top.command).toBe('genknown:compare');
    expect(second.command).toBe('genknown:open');
    expect(second.label).toBe('Taxon 562');
  });

  // What the plugin claims is what separates them: the same command, the
  // same letters, read out of an inventory rather than off a shape.
  it('ranks a record above an identifier', () => {
    const held: Offer = { ...offer, match: { ...offer.match, kind: 'record' } };
    expect(withOffers('P0AEX9', [held])[0].score).toBeGreaterThan(withOffers('P0AEX9')[0].score);
  });

  // A claim is checked against the query it answers: the tier comes from
  // where the workbench put the term, so an offer for a term nothing carried
  // is a row at the letters it scores and no more.
  it('weighs nothing for a term the query did not carry', () => {
    const elsewhere: Offer = { ...offer, match: { term: 'uniprot:Q9XYZ1', kind: 'record' } };
    const [row] = withOffers('P0AEX9', [elsewhere]);
    expect(row.evidence).toBeUndefined();
    expect(row.score).toBeCloseTo(
      withOffers('P0AEX9')[0].score - MATCH_WEIGHT.identifier * TIER_WEIGHT.typed,
      10,
    );
  });

  // The ranker reaches the same command by reading the argument's
  // description, which is a weaker thing to know than that the plugin serves
  // the namespace.
  it('ranks a plugin offer above the row the ranker would have built itself', () => {
    expect(withOffers('P0AEX9')[0].score).toBeGreaterThan(rank('P0AEX9')[0].score);
  });

  // An identifier claim is the plugin saying it recognised a shape, not that
  // it looked anything up, so the row survives a sentence the accession has
  // nothing to do with — ranked under anything the plugin holds.
  it('cannot tell a coincidence from a match', () => {
    const rows = withOffers('who is P0AEX9 in the chess database');
    expect(rows.map((r) => r.command)).toContain('function-junction:open');
  });
});

// What the host puts in the catalog beside the declarations: a plugin's
// launcher, its shortcut buttons, and the workbench's `show` for a plugin
// that has a sidebar pane. Each runs as its manifest wrote it.
describe('the calls a manifest filled in', () => {
  const calls: DeclaredCall[] = [
    {
      plugin: 'related',
      pluginTitle: 'Related',
      label: 'Show Related',
      command: 'workbench:show',
      args: { plugin: 'related' },
      description: 'What other plugins have about the open panel and the cart.',
    },
    // A button for a command its own plugin declares, with the argument the
    // author filled in.
    {
      plugin: 'jobs',
      pluginTitle: 'Jobs',
      label: 'Cancel job 12',
      command: 'jobs:cancel',
      args: { id: '12' },
    },
  ];
  const catalog = buildCommandIndex(commands, calls);
  const rankAll = (text: string, view: Partial<TieredTerms> = {}) =>
    rankCommands(catalog, text, tagText(text), { ...NOTHING, ...view });

  // The pane has no command of its own anywhere: this row is the only way
  // the ranker can reach one.
  it('reaches a pane by the name of the plugin that has it', () => {
    const [top] = rankAll('related');
    expect(top.command).toBe('workbench:show');
    expect(top.args).toEqual({ plugin: 'related' });
    expect(top.label).toBe('Show Related');
    // Whose row it is, which is not the plugin whose command it runs.
    expect(top.plugin).toBe('related');
  });

  it('reaches one by the words of the description rather than the label', () => {
    expect(rankAll('what other plugins have').map((r) => r.command)).toContain('workbench:show');
  });

  // The command the button names takes an id; the button already names one,
  // and the id in the text fills the declaration's row instead.
  it('runs as written, whatever the text carries', () => {
    const rows = rankAll('cancel job 12', { typed: ['job:99'] });
    expect(rows.find((r) => r.label === 'Cancel job 12')?.args).toEqual({ id: '12' });
    expect(rows.find((r) => r.label === undefined)?.args).toEqual({ id: '99' });
  });

  it('is one row with the command it repeats, when both would run the same thing', () => {
    const rows = rankAll('cancel this job', { typed: ['job:12'] });
    expect(rows.filter((r) => r.command === 'jobs:cancel')).toHaveLength(1);
  });

  // A call is matched on its label, its description and its plugin's name.
  // The command it runs belongs to whoever declared that command — here the
  // workbench — and naming that plugin must not drag every pane onto screen.
  it('is not reached by the name of the command it runs', () => {
    expect(rankAll('workbench').map((r) => r.command)).not.toContain('workbench:show');
  });
});
