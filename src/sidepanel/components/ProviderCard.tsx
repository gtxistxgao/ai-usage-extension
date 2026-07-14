import React from 'react';
import { msg } from '../../shared/i18n';
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
  /** Whether to show the per-model usage breakdown. */
  showModels?: boolean;
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
  showModels = false,
  emptyHint,
  footer,
}) => {
  const subtitle = loading
    ? msg('loadingSnapshot')
    : usage
      ? msg('updated', formatRelativeTime(usage.lastUpdated, now))
      : msg('notConnected');

  return (
    <UsageCard title={title} subtitle={subtitle} iconSrc={iconSrc} iconAlt={iconAlt}>
      {loading ? (
        <Skeleton />
      ) : usage ? (
        <>
          <UsageMetric label={msg('sessionLimit')} limit={usage.session} now={now} />
          <UsageMetric label={msg('weeklyLimit')} limit={usage.weekly} now={now} />
          {showModels &&
            (usage.models?.length ? (
              <div className="au-models">
                <p className="au-models__title">{msg('modelUsageHeading')}</p>
                {usage.models.map((model) => (
                  <UsageMetric key={model.id} label={model.label} limit={model.limit} now={now} />
                ))}
              </div>
            ) : (
              <p className="au-footnote">{msg('modelUsageEmpty')}</p>
            ))}
          {'plan' in usage && usage.plan !== 'unknown' && (
            <p className="au-footnote">{msg('planLabel', usage.plan)}</p>
          )}
        </>
      ) : (
        <p className="au-empty">{emptyHint}</p>
      )}
      {footer}
    </UsageCard>
  );
};
