import { msg } from '../shared/i18n';
import type { ProviderId, UsageState } from '../shared/types';
import { clampPercent } from '../shared/utils';

const DEFAULT_ICON_PATH = 'icons/badges/range-10.png';

const stepIconPath = (percent: number): string => {
  const clamped = clampPercent(percent);
  const range = Math.max(10, Math.ceil(clamped / 10) * 10);
  return `icons/badges/range-${range}.png`;
};

const PROVIDER_TITLE: Record<ProviderId, string> = { claude: 'Claude', codex: 'Codex' };
const SESSION_LABEL = msg('sessionLimit');

interface UsageSummary {
  percent: number;
  tooltip: string;
}

const summarizeUsage = (state: UsageState): UsageSummary | null => {
  const rows: number[] = [];

  (['claude', 'codex'] as const).forEach((provider) => {
    const usage = state[provider];
    if (!usage) return;
    rows.push(usage.session.percentage);
  });

  if (rows.length === 0) {
    return null;
  }

  const percent = Math.max(...rows);

  const tooltip = [
    msg('appShortName'),
    ...(['claude', 'codex'] as const).flatMap((provider) => {
      const usage = state[provider];
      if (!usage) return [];
      return [
        `${PROVIDER_TITLE[provider]} · ${SESSION_LABEL} ${clampPercent(usage.session.percentage)}%`,
      ];
    }),
  ].join('\n');

  return { percent, tooltip };
};

const resetBadge = async (): Promise<void> => {
  await Promise.all([
    chrome.action.setIcon({ path: DEFAULT_ICON_PATH }),
    chrome.action.setBadgeText({ text: '' }),
    chrome.action.setTitle({ title: msg('appShortName') }),
  ]);
};

export const updateBadge = async (state: UsageState): Promise<void> => {
  const summary = summarizeUsage(state);
  if (!summary) {
    await resetBadge();
    return;
  }

  await Promise.all([
    chrome.action.setIcon({ path: stepIconPath(summary.percent) }),
    chrome.action.setBadgeText({ text: '' }),
    chrome.action.setTitle({ title: summary.tooltip }),
  ]);
};
