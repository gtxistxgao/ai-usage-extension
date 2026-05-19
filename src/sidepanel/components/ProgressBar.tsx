import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, label, color = 'bg-blue-600' }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <span className="text-sm font-medium text-neutral-700">{percentage}%</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-2.5">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
