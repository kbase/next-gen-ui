import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import styles from './JobPanel.module.scss';
import { Button } from '../components/Button';
import { cx } from '../util/cx';
import { Frame } from '../components/Frame';
import { Chip } from '../components/Chip';
import { Progress } from '../components/Progress';
import { Loader } from '../components/Loader';
import * as Collapsible from '../components/Collapsible';
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  CaretDown,
  CheckCircle,
  CircleNotch,
  Clock,
  Prohibit,
  X,
  XCircle,
} from '@phosphor-icons/react';
import type { FrameAccent } from '../components/Frame';

export type JobStatus = 'queued' | 'running' | 'complete' | 'error' | 'canceled';

export interface JobStage {
  label: string;
  status: Extract<JobStatus, 'queued' | 'running' | 'complete' | 'error'>;
}

/**
 * Every state in one map, so none can be added without an icon. `color` is a
 * FrameAccent, not a ChipColor, because failed states also tint the border.
 */
const STATUS: Record<JobStatus, { icon: Icon; label: string; color: FrameAccent }> = {
  queued: { icon: Clock, label: 'Queued', color: 'primary' },
  running: { icon: CircleNotch, label: 'Running', color: 'primary' },
  complete: { icon: CheckCircle, label: 'Complete', color: 'green' },
  error: { icon: XCircle, label: 'Error', color: 'red' },
  canceled: { icon: Prohibit, label: 'Canceled', color: 'orange' },
};

export interface JobPanelProps {
  status: JobStatus;
  title: string;
  submitted: string;
  elapsed?: string;
  progress?: number;
  stages?: JobStage[];
  logLines?: string[];
  cellId?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewCell?: () => void;
  className?: string;
}

const STAGE_MARK: Record<JobStage['status'], ReactNode> = {
  queued: <span className={styles.dot} />,
  running: <Loader size={10} />,
  complete: <CheckCircle size={10} weight="bold" className={styles.markComplete} />,
  error: <XCircle size={10} weight="bold" className={styles.markError} />,
};

export function JobPanel({
  status,
  title,
  submitted,
  elapsed,
  progress,
  stages,
  logLines,
  cellId,
  onCancel,
  onRetry,
  onViewCell,
  className,
}: JobPanelProps) {
  const cfg = STATUS[status];
  const active = status === 'queued' || status === 'running';
  const failed = status === 'error' || status === 'canceled';

  return (
    // Frame's accent rather than a local border-color class: both are
    // single-class selectors, so the winner would depend on bundler order.
    <Frame
      padding={0}
      accent={failed ? cfg.color : undefined}
      className={cx(styles.root, className)}
    >
      <div className={cx(styles.header, active && !stages && styles.headerWithLoader)}>
        {active && !stages && <Loader size={12} />}
        <span className={styles.title}>{title}</span>
        <span style={{ flex: 1 }} />
        {elapsed && <span className={styles.mono}>{elapsed}</span>}
        <Chip color={cfg.color} onWhite icon={cfg.icon} label={cfg.label} />
      </div>

      {active && progress != null && (
        <div className={styles.progressArea}>
          <Progress value={progress} />
        </div>
      )}

      {stages && stages.length > 0 && (
        <div className={styles.stages}>
          {stages.map((st, i) => (
            <div key={i} className={cx(styles.stageRow, styles[`st_${st.status}`])}>
              <span className={styles.stageMark}>{STAGE_MARK[st.status]}</span>
              <span>{st.label}</span>
            </div>
          ))}
        </div>
      )}

      {logLines && logLines.length > 0 && (
        <div className={styles.logSection}>
          <Collapsible.Root>
            <Collapsible.Trigger render={<button type="button" className={styles.logTrigger} />}>
              <CaretDown size={12} className={styles.logChevron} />
              Log
              <span className={styles.logCount}>{logLines.length} lines</span>
            </Collapsible.Trigger>
            <Collapsible.Panel>
              <pre className={styles.logPre}>{logLines.join('\n')}</pre>
            </Collapsible.Panel>
          </Collapsible.Root>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.meta}>
          {submitted}
          {cellId && <> · cell {cellId}</>}
        </span>
        <div className={cx(styles.actions, failed && styles.errorActions)}>
          {cellId && onViewCell && (
            <Button variant="link" size="sm" onClick={onViewCell}>
              <ArrowSquareOut size={11} /> View cell
            </Button>
          )}
          {active && onCancel && (
            <Button variant="link" size="sm" onClick={onCancel}>
              <X size={11} /> Cancel
            </Button>
          )}
          {failed && onRetry && (
            <Button variant="link" size="sm" onClick={onRetry}>
              <ArrowCounterClockwise size={11} /> Retry
            </Button>
          )}
        </div>
      </div>
    </Frame>
  );
}
