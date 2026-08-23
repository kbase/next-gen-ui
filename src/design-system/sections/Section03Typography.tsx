import s from './showcase.module.scss';
import { Frame } from '../components/Frame';

export function Section03Typography() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>03</div>
      <div className={s.sTitle}>Typography</div>
      <p className={s.sDesc}>
        Oxygen for reading, Fira Code for data. Mono is data's voice: workspace refs, object IDs,
        file sizes, code snippets.
      </p>
      <p className={s.note}>
        Real names (Jane Doe) use byline. Usernames (jdoe) use mono; they're system identifiers.
        Scientific species and gene names use the <code>italic</code> class (
        <span className="italic">E. coli</span>, <span className="italic">P. trichocarpa</span>).
        Italics are also fine for occasional emphasis, but the primary use case in KBase is
        taxonomy.
      </p>

      <Frame padding={8}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--s-4)',
            marginBottom: 'var(--s-1)',
          }}
        >
          <div className="h1">Soil Metagenome Analysis</div>
          <span className="mono">ws:45221</span>
        </div>
        <div className="caption" style={{ marginBottom: 'var(--s-6)' }}>
          Last saved 2 hours ago · <span className="mono">jdoe</span>
        </div>
        <div className="h2" style={{ marginBottom: 'var(--s-3)' }}>
          Assembly Results
        </div>
        <div className="body" style={{ maxWidth: 520, marginBottom: 'var(--s-5)' }}>
          MEGAHIT assembled paired-end reads into contigs. Quality assessment passed minimum
          thresholds for N50 and completeness.
        </div>
        <div className="h3" style={{ marginBottom: 'var(--s-2)' }}>
          Quality metrics
        </div>
        <div
          className="note"
          style={{
            display: 'flex',
            gap: 'var(--s-7)',
            marginBottom: 'var(--s-6)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span className="mono-value">12,847</span> contigs
          </div>
          <div>
            <span className="mono-value">48.2 Mb</span> total
          </div>
          <div>
            <span className="mono-value">8,241</span> N50
          </div>
          <div>
            <span className="mono-value">52.3%</span> GC
          </div>
          <div>
            <span className="mono-value">2.4M</span> reads
          </div>
        </div>
        <div className="h4" style={{ marginBottom: 'var(--s-2)' }}>
          Contig distribution
        </div>
        <div className="body" style={{ maxWidth: 520, marginBottom: 'var(--s-5)' }}>
          Longest contig: 142,891 bp. 94% of contigs are between 500 and 50,000 bp.
        </div>
        <div
          className="mono"
          style={{ borderTop: '1px solid var(--c-border)', paddingTop: 'var(--s-4)' }}
        >
          KBaseGenomeAnnotations.Assembly-6.0 · obj/7/ver/2
        </div>
      </Frame>

      <div className={s.sub}>Scale</div>
      <p className={s.note}>
        Each role is a global CSS class. Fonts: <code>--f-sans</code> is Oxygen,{' '}
        <code>--f-mono</code> is Fira Code.
      </p>
      <div className={s.typeScaleWrap}>
        <table className={s.typeScale}>
          <thead>
            <tr>
              <th className={s.typeSize}>Token</th>
              <th>Role</th>
              <th className={s.typeUse}>Weight</th>
              <th className={s.typeUse}>Color</th>
              <th className={s.typeUse}>Class</th>
              <th className={s.typeUse}>When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={s.typeSize}>--fs-9</td>
              <td className="h1">h1</td>
              <td className={s.typeUse}>700</td>
              <td className={s.typeUse}>ink</td>
              <td className={s.typeUse}>
                <code>"h1"</code>
              </td>
              <td className={s.typeUse}>page titles</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-7</td>
              <td className="h2">h2</td>
              <td className={s.typeUse}>700</td>
              <td className={s.typeUse}>ink</td>
              <td className={s.typeUse}>
                <code>"h2"</code>
              </td>
              <td className={s.typeUse}>section headings</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-6</td>
              <td className="h3">h3</td>
              <td className={s.typeUse}>600</td>
              <td className={s.typeUse}>ink</td>
              <td className={s.typeUse}>
                <code>"h3"</code>
              </td>
              <td className={s.typeUse}>subsections</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-5</td>
              <td className="h4">h4</td>
              <td className={s.typeUse}>600</td>
              <td className={s.typeUse}>ink</td>
              <td className={s.typeUse}>
                <code>"h4"</code>
              </td>
              <td className={s.typeUse}>panel / card titles</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-5</td>
              <td className="body">body</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink2</td>
              <td className={s.typeUse}>
                <code>"body"</code>
              </td>
              <td className={s.typeUse}>prose, descriptions</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="label">label</td>
              <td className={s.typeUse}>600</td>
              <td className={s.typeUse}>ink3</td>
              <td className={s.typeUse}>
                <code>"label"</code>
              </td>
              <td className={s.typeUse}>form labels</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="byline">byline</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink3</td>
              <td className={s.typeUse}>
                <code>"byline"</code>
              </td>
              <td className={s.typeUse}>real names, attribution</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="section-label">section-label</td>
              <td className={s.typeUse}>600</td>
              <td className={s.typeUse}>ink2</td>
              <td className={s.typeUse}>
                <code>"section-label"</code>
              </td>
              <td className={s.typeUse}>form group headings</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="caption">caption</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink4</td>
              <td className={s.typeUse}>
                <code>"caption"</code>
              </td>
              <td className={s.typeUse}>timestamps, metadata</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="sub">sub</td>
              <td className={s.typeUse}>600</td>
              <td className={s.typeUse}>ink3</td>
              <td className={s.typeUse}>
                <code>"sub"</code>
              </td>
              <td className={s.typeUse}>section dividers</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="mono">mono</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink3</td>
              <td className={s.typeUse}>
                <code>"mono"</code>
              </td>
              <td className={s.typeUse}>IDs, refs, usernames, paths</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="mono-value">mono-value</td>
              <td className={s.typeUse}>700</td>
              <td className={s.typeUse}>ink2</td>
              <td className={s.typeUse}>
                <code>"mono-value"</code>
              </td>
              <td className={s.typeUse}>
                inline data: <span className="mono-value">12,847</span> contigs
              </td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="mono-secondary">mono-secondary</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink4</td>
              <td className={s.typeUse}>
                <code>"mono-secondary"</code>
              </td>
              <td className={s.typeUse}>table cells, file sizes</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-4</td>
              <td className="note">note</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink4</td>
              <td className={s.typeUse}>
                <code>"note"</code>
              </td>
              <td className={s.typeUse}>helper text, explanations</td>
            </tr>
            <tr>
              <td className={s.typeSize}>--fs-3</td>
              <td className="timestamp">timestamp</td>
              <td className={s.typeUse}>400</td>
              <td className={s.typeUse}>ink5</td>
              <td className={s.typeUse}>
                <code>"timestamp"</code>
              </td>
              <td className={s.typeUse}>
                <span className="timestamp">2:31 PM</span>
              </td>
            </tr>
            <tr>
              <td className={s.typeSize}></td>
              <td className="italic body">E. coli</td>
              <td className={s.typeUse}>inherit</td>
              <td className={s.typeUse}>inherit</td>
              <td className={s.typeUse}>
                <code>"italic"</code>
              </td>
              <td className={s.typeUse}>species, gene names</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={s.note}>Dense, not dramatic. Every size has a job.</p>
    </div>
  );
}
