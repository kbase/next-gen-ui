import s from './showcase.module.scss';
import { CodeBlock } from '../components/CodeBlock';
import { Frame } from '../components/Frame';

export function Section11Implementation() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>11</div>
      <div className={s.sTitle}>Code theme</div>
      <p className={s.sDesc}>
        Custom Prism syntax-highlighting theme built from design tokens. Tuned for the warm-neutral
        cream palette so code samples sit naturally inside the rest of the surface.
      </p>

      <div className={s.sub}>Python (KBase SDK pattern)</div>
      <CodeBlock
        collapsible={false}
        language="python"
        code={`"""Genome annotation pipeline \u2014 KBase SDK app."""
from typing import Optional
from dataclasses import dataclass, field
from installed_clients.WorkspaceClient import Workspace
from installed_clients.GenomeAnnotationAPIClient import GenomeAnnotationAPI

@dataclass
class AssemblyStats:
    """Quality metrics for an assembled metagenome."""
    n_contigs: int
    total_length: int
    n50: int
    gc_content: float
    reads_mapped: Optional[int] = None

    @property
    def passes_threshold(self) -> bool:
        return self.n50 >= 5000 and self.total_length >= 1_000_000

    def as_report_dict(self) -> dict:
        return {
            "contigs": f"{self.n_contigs:,}",
            "total": f"{self.total_length / 1e6:.1f} Mb",
            "n50": f"{self.n50:,}",
            "gc": f"{self.gc_content:.1%}",
        }


class AnnotationPipeline:
    """Run MEGAHIT + Prokka on paired-end reads."""

    SUPPORTED_TYPES = {"KBaseFile.PairedEndLibrary", "KBaseFile.SingleEndLibrary"}
    MAX_CONTIGS = 50_000

    def __init__(self, ws_url: str, token: str, scratch: str = "/tmp"):
        self.ws = Workspace(ws_url, token=token)
        self.ga = GenomeAnnotationAPI(ws_url, token=token)
        self.scratch = scratch
        self._stats: dict[str, AssemblyStats] = {}

    def validate_input(self, ref: str) -> dict:
        """Check object type and permissions before running."""
        info = self.ws.get_object_info3({"objects": [{"ref": ref}]})["infos"][0]
        obj_type = info[2].split("-")[0]
        if obj_type not in self.SUPPORTED_TYPES:
            raise ValueError(
                f"Expected paired-end reads, got {obj_type}. "
                f"Supported: {', '.join(sorted(self.SUPPORTED_TYPES))}"
            )
        return {"name": info[1], "type": obj_type, "ws": info[6], "ver": info[4]}

    async def run(self, reads_ref: str, workspace_id: int) -> str:
        """Assemble, annotate, and save results."""
        meta = self.validate_input(reads_ref)

        # Stage 1: Assembly
        assembly = await self._assemble(reads_ref)
        stats = self._compute_stats(assembly)
        self._stats[reads_ref] = stats

        if stats.n_contigs > self.MAX_CONTIGS:
            raise RuntimeError(
                f"Assembly produced {stats.n_contigs:,} contigs "
                f"(max {self.MAX_CONTIGS:,}). Try filtering reads first."
            )

        # Stage 2: Annotation
        genome_ref = await self._annotate(assembly, meta["name"], workspace_id)
        return genome_ref

    def get_stats(self, ref: str) -> AssemblyStats:
        if ref not in self._stats:
            raise KeyError(f"No stats for {ref}. Run pipeline first.")
        return self._stats[ref]`}
      />

      <div className={s.sub}>TypeScript (tokens + styled component)</div>
      <CodeBlock
        collapsible={false}
        language="typescript"
        code={`// tokens.ts \u2014 single source of truth
export const t = {
  bg:      '#F5F2EE',
  surface: '#FFFFFF',
  border:  'rgba(62,56,50,0.09)',
  ink:     '#1A1714',
  ink2:    '#3E3832',
  ink3:    '#6A6158',
  ink4:    '#776D64',
  primary: '#007DC3',
  teal:    '#009688',
  red:     '#D2232A',
  sans: \`'Oxygen', system-ui, sans-serif\`,
  mono: \`'Fira Code', ui-monospace, monospace\`,
  r: { sm: 4, md: 8, lg: 12, full: 999 },
} as const;`}
      />

      <CodeBlock
        collapsible={false}
        language="tsx"
        code={`// KBChip.tsx \u2014 one class, color via prop
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// The eight tinted families. neutral is not one of them: it takes
// --c-raised / --c-border2 / --c-ink3, so it needs its own branch.
type TintedColor = 'primary' | 'teal' | 'ocean' | 'green'
  | 'yellow' | 'orange' | 'red' | 'purple';

export const KBChip = styled(Box, {
  shouldForwardProp: (p) => p !== 'color',
})<{ color: TintedColor }>(({ color }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 'var(--fs-3)',
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: t.r.sm,
  background: \`var(--bg-\${color})\`,
  color: \`var(--ct-\${color})\`,
  // Shorthand first: after it, borderColor would be reset to currentColor.
  border: '1px solid',
  borderColor: \`var(--bo-\${color})\`,
}));`}
      />

      <div className={s.sub}>Prose</div>
      <p className={s.note}>
        A class, not a component, for markup the app did not write: a rendered answer, a served{' '}
        <code>.md</code>, a description field. Put <code>prose</code> on the wrapper. Every role
        matches a utility in section 03 &mdash; the root is <code>.body</code>, headings are{' '}
        <code>.h1</code>&ndash;<code>.h4</code>, links are <code>.link</code>, inline code is{' '}
        <code>.mono</code> &mdash; so rendered and hand-written markup agree. Every element
        CommonMark and GFM emit is below.
      </p>
      <Frame>
        <div className="prose">
          <h1>Rhizosphere assembly</h1>
          <p>
            N50 rose from 18 kb to <strong>42 kb</strong> after trimming, though <em>coverage</em>{' '}
            fell in two <a href="#prose">repeat regions</a>. Both were flagged by{' '}
            <code>checkm2 --lowmem</code>
            <sup>
              <a href="#fn-1">1</a>
            </sup>{' '}
            and neither is resolved. Press <kbd>R</kbd> to re-run.
          </p>

          <h2>Method</h2>
          <p>Three stages, each recorded in the workspace.</p>
          <ol>
            <li>Trim with fastp at default thresholds</li>
            <li>
              Assemble with MEGAHIT
              <ul>
                <li>Extended k-mer list</li>
                <li>
                  Minimum contig length <code>500</code>
                </li>
              </ul>
            </li>
            <li>Bin with MetaBAT2</li>
          </ol>

          <h3>Caveats</h3>
          <blockquote>
            <p>Runs before 2026-03 used SPAdes and are not comparable.</p>
            <blockquote>
              <p>A nested quote keeps a rule at each level.</p>
            </blockquote>
            <p>Re-run them before quoting a delta.</p>
          </blockquote>

          <h4>
            Invocation of <code>run_megahit</code>
          </h4>
          <pre className="language-python">
            <code className="language-python">
              <span className="token comment"># staged from the workspace</span>
              {'\n'}
              <span className="token keyword">def</span>{' '}
              <span className="token function">assemble</span>
              <span className="token punctuation">(</span>ref
              <span className="token punctuation">)</span>
              <span className="token punctuation">:</span>
              {'\n    '}
              <span className="token keyword">return</span> au
              <span className="token punctuation">.</span>
              <span className="token function">run_megahit</span>
              <span className="token punctuation">(</span>
              <span className="token punctuation">{'{'}</span>
              {'\n        '}
              <span className="token string">"read_library_ref"</span>
              <span className="token punctuation">:</span> ref
              <span className="token punctuation">,</span>
              {'\n        '}
              <span className="token string">"min_contig_len"</span>
              <span className="token punctuation">:</span> <span className="token number">500</span>
              <span className="token punctuation">,</span>
              {'\n    '}
              <span className="token punctuation">{'}'}</span>
              <span className="token punctuation">)</span>
            </code>
          </pre>

          <p>A fence with no language keeps the same chrome:</p>
          <pre>
            <code>{`contigs.fasta  48.2 Mb\nbins/          14 files`}</code>
          </pre>

          <p>A block the app replaced keeps none of it:</p>
          <pre>
            <div className={s.note} style={{ margin: 0 }}>
              [ a diagram the app rendered in place of the fence ]
            </div>
          </pre>

          <h4>Read counts</h4>
          <p>Markdown carries a column&rsquo;s alignment, so the numbers stay on their decimals.</p>
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th align="center">Run</th>
                <th align="right">Reads</th>
                <th align="right">Pass %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Raw</td>
                <td align="center">A</td>
                <td align="right">2,412,004</td>
                <td align="right">n/a</td>
              </tr>
              <tr>
                <td>Trimmed</td>
                <td align="center">A</td>
                <td align="right">2,109,551</td>
                <td align="right">87.5</td>
              </tr>
              <tr>
                <td>Aligned</td>
                <td align="center">B</td>
                <td align="right">1,904,332</td>
                <td align="right">90.4</td>
              </tr>
            </tbody>
          </table>

          <h5>Outstanding</h5>
          <ul>
            <li>
              <input type="checkbox" checked readOnly /> Re-run the 2026-02 libraries
            </li>
            <li>
              <input type="checkbox" readOnly /> Resolve the two repeat regions
            </li>
          </ul>

          <h6>Superseded</h6>
          <p>
            <del>Bin with MaxBin2</del> &mdash; replaced by MetaBAT2 in 2026-01.
            <br />A hard break sits above this line.
          </p>

          <dl>
            <dt>N50</dt>
            <dd>Length at which half the assembly sits in contigs of that size or longer.</dd>
            <dt>Completeness</dt>
            <dd>
              Fraction of expected single-copy markers found, as reported by <code>checkm2</code>.
            </dd>
          </dl>

          <details>
            <summary>Full parameter set</summary>
            <p>
              Everything not shown above stayed at its default. Coverage was computed with{' '}
              <code>samtools depth</code> at CO<sub>2</sub>-corrected depth.
            </p>
          </details>

          <hr />

          <p>A figure takes the measure of the text and scales down rather than overflowing it.</p>
          <img
            src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='90'%3E%3Crect width='420' height='90' fill='%23d9d4c8'/%3E%3Ctext x='210' y='52' font-family='monospace' font-size='13' text-anchor='middle' fill='%235c554a'%3Ecoverage histogram%3C/text%3E%3C/svg%3E"
            alt="Placeholder coverage histogram"
          />

          <section className="footnotes">
            <ol>
              <li id="fn-1">
                <p>
                  Run with <code>--lowmem</code> because the node had 64 GB.{' '}
                  <a href="#prose">&#8617;</a>
                </p>
              </li>
            </ol>
          </section>
        </div>
      </Frame>
      <CodeBlock language="tsx" code={`<div className="prose">{renderMarkdown(text)}</div>`} />
      <p className={s.note}>
        Highlighting is the app&rsquo;s, not the system&rsquo;s: colouring a fence means running a
        tokenizer over it. The theme above ships the colours for the spans a tokenizer produces, and{' '}
        <code>.prose</code> leaves those spans alone. A <code>pre</code> whose child is not a{' '}
        <code>code</code> element is treated as a block the app substituted &mdash; a diagram, a
        chart &mdash; and keeps no chrome of its own.
      </p>
    </div>
  );
}
