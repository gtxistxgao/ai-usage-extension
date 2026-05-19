import React from 'react';

interface UsageCardProps {
  title: string;
  subtitle?: string;
  tone?: 'ok' | 'warning' | 'critical';
  iconSrc?: string;
  iconAlt?: string;
  children: React.ReactNode;
}

export const UsageCard: React.FC<UsageCardProps> = ({ title, subtitle, tone = 'ok', iconSrc, iconAlt, children }) => {
  return (
    <section className={`au-card au-card--${tone}`}>
      <header className="au-card__header">
        <div className="au-card__head">
          {iconSrc && <img className="au-brand" src={iconSrc} alt={iconAlt ?? `${title} logo`} />}
          <div>
          <h2 className="au-card__title">{title}</h2>
          {subtitle && <p className="au-card__subtitle">{subtitle}</p>}
          </div>
        </div>
      </header>
      <div className="au-card__body">{children}</div>
    </section>
  );
};
