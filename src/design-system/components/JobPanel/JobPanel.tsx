import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import styles from './JobPanel.module.scss';
import { cx } from '../../util/cx';
import { Frame } from '../Frame';
import { Chip } from '../Chip';
import { Progress } from '../Progress';
import { Loader } from '../Loader';
import * as Collapsible from '../Collapsible';
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
import type { FrameAccent } from '../Frame';

export type JobStatus = 'queued' | 'running' | 'complete' | 'error' | 'canceled';

export interface JobStage {
  label: string;
  status: Extract<JobStatus, 'queued' | 'running' | 'complete' | 'error'>;
}

/**
 * A job's states, in one map so a new one cannot arrive without an icon.
 * `color` is a FrameAccent, the eight tinted families, because the failed
 * states colour the panel's border with it as well as the chip. A state that
 * wanted Chip's neutral would have to stop doing that.
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
    // The border repeats what the chip says. Frame's own accent rather than a
    // border-color class here: both would be single-class selectors on one
    // element from two css modules, so which won would come down to the order
    // the bundler happened to emit them in.
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
            <button type="button" className={styles.actionBtn} onClick={onViewCell}>
              <ArrowSquareOut size={11} /> View cell
            </button>
          )}
          {active && onCancel && (
            <button type="button" className={styles.actionBtn} onClick={onCancel}>
              <X size={11} /> Cancel
            </button>
          )}
          {failed && onRetry && (
            <button type="button" className={styles.actionBtn} onClick={onRetry}>
              <ArrowCounterClockwise size={11} /> Retry
            </button>
          )}
        </div>
      </div>
    </Frame>
  );
}
