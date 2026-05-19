export type UsageTone = 'ok' | 'warning' | 'critical';

export const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const getUsageTone = (value: number): UsageTone => {
  const percent = clampPercent(value);

  if (percent >= 90) {
    return 'critical';
  }

  if (percent >= 70) {
    return 'warning';
  }

  return 'ok';
};
