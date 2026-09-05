import { describe, expect, it } from 'vitest';
import { match as data } from './data/match';
import { match as jobs } from './jobs/match';
import { match as functionJunction } from './function-junction/match';
import { match as genknown } from './genknown/match';

const matchers = { data, jobs, functionJunction, genknown };

describe('local matchers', () => {
  it('say nothing about empty or unrelated text', () => {
    for (const [name, match] of Object.entries(matchers)) {
      expect(match(''), name).toEqual([]);
      expect(match('   '), name).toEqual([]);
      expect(match('what happened yesterday'), name).toEqual([]);
    }
  });

  it('offer an action the plugin can read back as params', () => {
    for (const [name, match] of Object.entries(matchers)) {
      for (const offer of match('genome')) {
        expect(offer.label, name).toBeTruthy();
        expect(Object.keys(offer.action).length, name).toBeGreaterThan(0);
      }
    }
  });

  it('recognises identifiers by shape', () => {
    expect(functionJunction('P0A7B8').map((o) => o.action)).toEqual([
      { view: 'dossier', accession: 'P0A7B8' },
      { view: 'structure', accession: 'P0A7B8' },
    ]);
    expect(functionJunction('nifH')[0].action).toEqual({ view: 'dossier', gene: 'nifH' });
    expect(genknown('GCF_000005845.2')[0].action.assembly).toBe('GCF_000005845.2');
    expect(genknown('E. coli')[0].action).toEqual({ view: 'organism', organism: 'E. coli' });
  });

  // A gene symbol is a lowercase stem with a capital; ordinary words are
  // not, which is what keeps the bar quiet while a sentence is typed.
  it('leaves ordinary words alone', () => {
    for (const word of ['the', 'nitrogen', 'Escherichia']) {
      expect(functionJunction(word), word).toEqual([]);
    }
  });

  it('answers from an inventory where the plugin has one', () => {
    expect(data('nifh')[0].action).toEqual({ ref: 'nifh-hits' });
    expect(data('74501/3/1')[0].action).toEqual({ ref: '74501/3/1' });
    // A UPA the fixtures do not hold still reaches the KBase 1.0 bridge.
    expect(data('1/2/3')[0].action).toEqual({ ref: '1/2/3' });
    expect(jobs('job 12')[0].action).toEqual({ id: '12' });
    // A number that names no job is not a job.
    expect(jobs('999')).toEqual([]);
  });
});
