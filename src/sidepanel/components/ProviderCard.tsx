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
  /** Optional content pinned to the bottom of the card (e.g. a setting). */
  footer?: React.ReactNode;
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
  footer,
}) => {
  const subtitle = loading
    ? 'loading snapshot'
    : usage
      ? `updated ${formatRelativeTime(usage.lastUpdated, now)}`
      : 'not connected';

  return (
    <UsageCard title={title} subtitle={subtitle} iconSrc={iconSrc} iconAlt={iconAlt}>
      {loading ? (
        <Skeleton />
      ) : usage ? (
        <>
          <UsageMetric label="Session · 5h" limit={usage.session} now={now} />
          <UsageMetric label="Weekly · 7d" limit={usage.weekly} now={now} />
          {'plan' in usage && usage.plan !== 'unknown' && (
            <p className="au-footnote">Plan · {usage.plan}</p>
          )}
        </>
      ) : (
        <p className="au-empty">{emptyHint}</p>
      )}
      {footer}
    </UsageCard>
  );
};
