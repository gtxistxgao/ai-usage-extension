import React from 'react';
import { clampPercent, getUsageTone } from '../../shared/utils';

interface ProgressBarProps {
  percentage: number;
  label: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, label }) => {
  const value = clampPercent(percentage);
  const tone = getUsageTone(value);

  return (
    <div className="au-progress">
      <div className="au-progress__row">
        <span className="au-progress__label">{label}</span>
        <span className="au-progress__value">{value}%</span>
      </div>
      <div
        className={`au-meter au-meter--${tone}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="au-meter__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};
