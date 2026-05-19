import React from 'react';
import type { UsageLimit } from '../../shared/types';
import { formatReset } from '../../shared/utils';
import { ProgressBar } from './ProgressBar';

interface UsageMetricProps {
  label: string;
  limit: UsageLimit;
  now: number;
}

/** A labelled progress bar plus its "used / limit · resets" caption. */
export const UsageMetric: React.FC<UsageMetricProps> = ({ label, limit, now }) => {
  const hasCount = typeof limit.used === 'number' && typeof limit.limit === 'number';

  return (
    <div className="au-metric">
      <ProgressBar label={label} percentage={limit.percentage} />
      <p className="au-meta">
        {hasCount && (
          <>
            <span>{limit.used}</span> / {limit.limit} ·{' '}
          </>
        )}
        resets <span>{formatReset(limit.resetsAt, now)}</span>
      </p>
    </div>
  );
};
