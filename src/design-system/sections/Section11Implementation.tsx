import s from './showcase.module.scss';
import { CodeBlock } from '../components/CodeBlock';

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
    </div>
  );
}
