import type { ReactNode } from 'react';
import styles from './AppCard.module.scss';
import { cx } from '../../util/cx';
import { Frame } from '../Frame';
import { TypeBadge } from '../TypeBadge';
import type { TypeBadgeColor } from '../TypeBadge';
import { Star } from '@phosphor-icons/react';

interface TypeDef {
  abbr: string;
  color: TypeBadgeColor;
}

function groupTypes(types: TypeDef[]) {
  const groups: (TypeDef & { count: number })[] = [];
  for (const t of types) {
    const last = groups[groups.length - 1];
    if (last && last.abbr === t.abbr && last.color === t.color) {
      last.count++;
    } else {
      groups.push({ ...t, count: 1 });
    }
  }
  return groups;
}

export interface AppCardProps {
  icon?: ReactNode;
  name: string;
  version?: string;
  authors?: string[];
  description?: string;
  inputTypes?: { abbr: string; color: TypeBadgeColor }[];
  outputTypes?: { abbr: string; color: TypeBadgeColor }[];
  favorite?: boolean;
  onFavoriteToggle?: () => void;
  onClick?: () => void;
  className?: string;
}

export function AppCard({
  icon,
  name,
  version,
  authors,
  description,
  inputTypes,
  outputTypes,
  favorite,
  onFavoriteToggle,
  onClick,
  className,
}: AppCardProps) {
  const body = (
    <>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <span className={styles.name}>{name}</span>
          {version && <span className={styles.version}>{version}</span>}
        </div>
        {authors && authors.length > 0 && (
          <div className={styles.authors}>{authors.join(', ')}</div>
        )}
        {description && <div className={styles.desc}>{description}</div>}
        {(inputTypes || outputTypes) && (
          <div className={styles.types}>
            {inputTypes &&
              groupTypes(inputTypes).map((t) => (
                <span key={`in-${t.abbr}`} className={t.count > 1 ? styles.typeStack : undefined}>
                  <TypeBadge color={t.color}>{t.abbr}</TypeBadge>
                  {t.count > 1 && <TypeBadge color={t.color}>{t.abbr}</TypeBadge>}
                </span>
              ))}
            {inputTypes && outputTypes && <span className={styles.arrow}>→</span>}
            {outputTypes &&
              groupTypes(outputTypes).map((t) => (
                <span key={`out-${t.abbr}`} className={t.count > 1 ? styles.typeStack : undefined}>
                  <TypeBadge color={t.color}>{t.abbr}</TypeBadge>
                  {t.count > 1 && <TypeBadge color={t.color}>{t.abbr}</TypeBadge>}
                </span>
              ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <Frame padding={0} className={cx(styles.root, className)}>
      <div className={styles.inner}>
        {onClick ? (
          <button type="button" className={styles.clickable} onClick={onClick} aria-label={name}>
            {body}
          </button>
        ) : (
          <div className={styles.clickable}>{body}</div>
        )}
        {onFavoriteToggle && (
          <button
            type="button"
            className={styles.fav}
            onClick={onFavoriteToggle}
            aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Star size={14} weight={favorite ? 'fill' : 'regular'} />
          </button>
        )}
      </div>
    </Frame>
  );
}
