import React from 'react';
import type { ClaudeUsage, CodexUsage } from '../../shared/types';
import { formatRelativeTime } from '../../shared/utils';
import { UsageCard } from './UsageCard';
import { UsageMetric } from './UsageMetric';

type ProviderUsage = ClaudeUsage | CodexUsage;

interface ProviderCardProps {
  title: string;
  iconSrc: string;
  iconAlt: string;
  usage?: ProviderUsage;
  loading: boolean;
  now: number;
  /** Hint shown when the provider has no snapshot yet. */
  emptyHint: string;
}

const Skeleton: React.FC = () => (
  <div className="au-loader" aria-hidden="true">
    <div className="au-loader__line au-loader__line--w80" />
    <div className="au-loader__bar" />
    <div className="au-loader__line au-loader__line--w60" />
  </div>
);

/** Renders one provider's usage, handling loading / empty / data states. */
export const ProviderCard: React.FC<ProviderCardProps> = ({
  title,
  iconSrc,
  iconAlt,
  usage,
  loading,
  now,
  emptyHint,
}) => {
  if (loading) {
    return (
      <UsageCard title={title} subtitle="loading snapshot" iconSrc={iconSrc} iconAlt={iconAlt}>
        <Skeleton />
      </UsageCard>
    );
  }

  if (!usage) {
    return (
      <UsageCard title={title} subtitle="not connected" iconSrc={iconSrc} iconAlt={iconAlt}>
        <p className="au-empty">{emptyHint}</p>
      </UsageCard>
    );
  }

  return (
    <UsageCard
      title={title}
      subtitle={`updated ${formatRelativeTime(usage.lastUpdated, now)}`}
      tone={usage.status}
      iconSrc={iconSrc}
      iconAlt={iconAlt}
    >
      <UsageMetric label="Session · 5h" limit={usage.session} now={now} />
      <UsageMetric label="Weekly · 7d" limit={usage.weekly} now={now} />
      {'plan' in usage && usage.plan !== 'unknown' && (
        <p className="au-footnote">Plan · {usage.plan}</p>
      )}
    </UsageCard>
  );
};
