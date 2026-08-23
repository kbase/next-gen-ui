import { useState } from 'react';
import { AppCard } from '../components/AppCard';
import s from './appendix-shared.module.scss';
import { Dna, Flask, TreeStructure, Leaf, Bug } from '@phosphor-icons/react';

export function AppCatalogAppendix() {
  const [favs, setFavs] = useState<Set<string>>(new Set(['megahit']));
  const toggleFav = (id: string) =>
    setFavs((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className={s.root}>
      <div className={s.num}>C</div>
      <div className={s.title}>App catalog pattern</div>
      <p className={s.desc}>
        AppCard composes Frame and TypeBadge. Apps arrange the cards in a searchable grid or list.
      </p>
      <p className={s.note}>
        Duplicate input or output types stack. The favorite star uses weight as state: regular when
        off, fill when on. The whole card is clickable.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-4)',
          marginTop: 'var(--s-7)',
        }}
      >
        <AppCard
          icon={<Dna size={20} />}
          name="MEGAHIT"
          version="v2.1.1"
          authors={['Li, D.', 'Liu, C.']}
          description="Ultra-fast and memory-efficient assembler for large and complex metagenomics sequencing data."
          inputTypes={[{ abbr: 'Rd', color: 'orange' }]}
          outputTypes={[{ abbr: 'As', color: 'teal' }]}
          favorite={favs.has('megahit')}
          onFavoriteToggle={() => toggleFav('megahit')}
          onClick={() => {}}
        />
        <AppCard
          icon={<Flask size={20} />}
          name="Prokka"
          version="v1.14.6"
          authors={['Seemann, T.']}
          description="Rapid prokaryotic genome annotation. Identifies CDS, rRNA, tRNA, signal peptides, and non-coding RNA."
          inputTypes={[{ abbr: 'Gn', color: 'primary' }]}
          outputTypes={[{ abbr: 'Gn', color: 'primary' }]}
          favorite={favs.has('prokka')}
          onFavoriteToggle={() => toggleFav('prokka')}
          onClick={() => {}}
        />
        <AppCard
          icon={<TreeStructure size={20} />}
          name="Build Pangenome"
          version="v0.9.2"
          authors={['Price, G.', 'Arkin, A.']}
          description="Construct a pangenome from a set of related genomes using bidirectional best hits."
          inputTypes={[
            { abbr: 'Gn', color: 'primary' },
            { abbr: 'Gn', color: 'primary' },
          ]}
          outputTypes={[{ abbr: 'Pn', color: 'green' }]}
          favorite={favs.has('pangenome')}
          onFavoriteToggle={() => toggleFav('pangenome')}
          onClick={() => {}}
        />
        <AppCard
          icon={<Bug size={20} />}
          name="CheckM"
          version="v1.2.2"
          authors={['Parks, D.', 'Imelfort, M.']}
          description="Assess the quality of microbial genomes recovered from isolates, single cells, and metagenomes."
          inputTypes={[{ abbr: 'As', color: 'teal' }]}
          outputTypes={[{ abbr: 'Rp', color: 'ocean' }]}
          onClick={() => {}}
        />
        <AppCard
          icon={<Leaf size={20} />}
          name="RAST"
          version="v2.0"
          authors={['Overbeek, R.', 'Olson, R.']}
          description="Rapid Annotations using Subsystems Technology for complete or near-complete prokaryotic and archaeal genomes."
          inputTypes={[{ abbr: 'Gn', color: 'primary' }]}
          outputTypes={[{ abbr: 'Gn', color: 'primary' }]}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
