import type { ReactNode } from 'react';
import styles from './JobPanel.module.scss';
import { cx } from '../../util/cx';
import { Frame } from '../Frame';
import { Chip } from '../Chip';
import { Progress } from '../Progress';
import { Loader } from '../Loader';
import { Accordion } from '../Accordion';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Prohibit,
  ArrowCounterClockwise,
  X,
  ArrowSquareOut,
} from '@phosphor-icons/react';

export type JobStatus = 'queued' | 'running' | 'completed' | 'error' | 'terminated';

export interface JobStage {
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

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

const STATUS: Record<
  JobStatus,
  {
    color: 'primary' | 'green' | 'red' | 'yellow';
    icon: ReactNode;
    label: string;
  }
> = {
  queued: { color: 'primary', icon: <Clock size={9} weight="bold" />, label: 'Queued' },
  running: { color: 'primary', icon: <Play size={9} weight="bold" />, label: 'Running' },
  completed: { color: 'green', icon: <CheckCircle size={9} weight="bold" />, label: 'Completed' },
  error: { color: 'red', icon: <XCircle size={9} weight="bold" />, label: 'Error' },
  terminated: { color: 'yellow', icon: <Prohibit size={9} weight="bold" />, label: 'Terminated' },
};

const STAGE_MARK: Record<JobStage['status'], ReactNode> = {
  pending: <span className={styles.dot} />,
  running: <Loader size={10} />,
  completed: <CheckCircle size={10} weight="bold" style={{ color: 'var(--c-teal)' }} />,
  error: <XCircle size={10} weight="bold" style={{ color: 'var(--c-red)' }} />,
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
  const failed = status === 'error' || status === 'terminated';

  return (
    <Frame className={cx(styles.root, failed && styles[status], className)}>
      <div className={cx(styles.header, active && !stages && styles.headerWithLoader)}>
        {active && !stages && <Loader size={12} />}
        <span className={styles.title}>{title}</span>
        <span style={{ flex: 1 }} />
        {elapsed && <span className={styles.mono}>{elapsed}</span>}
        <Chip color={cfg.color} onWhite>
          {cfg.icon} {cfg.label}
        </Chip>
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
          <Accordion title={`Log · ${logLines.length} lines`}>
            <pre className={styles.logPre}>{logLines.join('\n')}</pre>
          </Accordion>
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
