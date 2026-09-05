// Mock datasets. A ref is either a dataset id or, through the KBase 1.0
// bridge, a workspace UPA (`<ws>/<obj>` or `<ws>/<obj>/<ver>`).

export interface Dataset {
  ref: string;
  name: string;
  type: string;
  size: string;
  source: 'arc' | 'upload' | 'kbase-1.0';
  producedBy?: string;
  narrative?: string;
}

export const datasets: Dataset[] = [
  {
    ref: 'nitro-reads',
    name: 'nitro-isolates.fastq',
    type: 'Reads',
    size: '2.1 GB',
    source: 'upload',
  },
  {
    ref: 'assembly-12',
    name: 'isolate-12 assembly',
    type: 'Assembly',
    size: '4.8 MB',
    source: 'arc',
    producedBy: 'nitro',
  },
  {
    ref: 'nifh-hits',
    name: 'nifH BLAST hits',
    type: 'Table',
    size: '120 KB',
    source: 'arc',
    producedBy: 'nitro',
  },
  {
    ref: '74501/3/1',
    name: 'Rhodobacter_sphaeroides_2.4.1',
    type: 'KBaseGenomes.Genome',
    size: '9.6 MB',
    source: 'kbase-1.0',
    narrative: 'Narrative 74501',
  },
  {
    ref: '74501/7/2',
    name: 'RS_pangenome',
    type: 'KBaseGenomes.Pangenome',
    size: '31 MB',
    source: 'kbase-1.0',
    narrative: 'Narrative 74501',
  },
  {
    ref: '68210/2/1',
    name: 'soil_metagenome_bin_4',
    type: 'KBaseMetagenomes.BinnedContigs',
    size: '52 MB',
    source: 'kbase-1.0',
    narrative: 'Narrative 68210',
  },
  { ref: 'crash-test', name: 'Crash test panel', type: 'Fixture', size: '0 B', source: 'upload' },
];

export const dataset = (ref: string) => datasets.find((d) => d.ref === ref);
