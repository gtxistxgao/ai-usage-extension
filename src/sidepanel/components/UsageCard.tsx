import React from 'react';
import type { UsageStatus } from '../../shared/types';

export type CardTone = UsageStatus | 'neutral';

interface UsageCardProps {
  title: string;
  subtitle?: string;
  tone?: CardTone;
  iconSrc?: string;
  iconAlt?: string;
  children: React.ReactNode;
}

/** Presentational shell for a single provider's usage panel. */
export const UsageCard: React.FC<UsageCardProps> = ({
  title,
  subtitle,
  tone = 'neutral',
  iconSrc,
  iconAlt,
  children,
}) => {
  return (
    <section className={`au-card au-card--${tone}`}>
      <header className="au-card__header">
        {iconSrc && <img className="au-brand" src={iconSrc} alt={iconAlt ?? `${title} logo`} />}
        <div className="au-card__heading">
          <h2 className="au-card__title">{title}</h2>
          {subtitle && <p className="au-card__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="au-card__body">{children}</div>
    </section>
  );
};
