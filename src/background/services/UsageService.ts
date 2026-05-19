import { STORAGE_KEYS } from '../../shared/constants';
import { ClaudeUsage, CodexUsage, UsageState } from '../../shared/types';
import { getUsageTone } from '../../shared/utils';

export class UsageService {
  private static readonly STORAGE_KEY = STORAGE_KEYS.usageState;
  private static readonly CLAUDE_ORG_KEY = STORAGE_KEYS.claudeOrgId;

  private static readonly CODEX_SESSION_ENDPOINT = 'https://chatgpt.com/api/auth/session';
  private static readonly CODEX_USAGE_ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage';

  static async getUsageState(): Promise<UsageState> {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    return (data[this.STORAGE_KEY] || {}) as UsageState;
  }

  static async saveUsageState(state: UsageState): Promise<void> {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: state });
  }

  static async refreshAllUsage(): Promise<UsageState> {
    const [claude, codex] = await Promise.all([
      this.fetchClaudeUsage().catch(() => null),
      this.fetchCodexUsage().catch(() => null),
    ]);

    const state = await this.getUsageState();

    if (claude) {
      state.claude = claude;
    }

    if (codex) {
      state.codex = codex;
    }

    await this.saveUsageState(state);
    return state;
  }

  static async fetchClaudeUsage(): Promise<ClaudeUsage | null> {
    const orgId = await this.getClaudeOrgId();
    if (!orgId) {
      return null;
    }

    try {
      const response = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await chrome.storage.local.remove(this.CLAUDE_ORG_KEY);
        }
        return null;
      }

      const raw = await response.json();
      return this.parseClaudeUsage(raw);
    } catch {
      return null;
    }
  }

  static async fetchCodexUsage(): Promise<CodexUsage | null> {
    try {
      const sessionResponse = await fetch(this.CODEX_SESSION_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!sessionResponse.ok) {
        return null;
      }

      const sessionData = this.asRecord(await sessionResponse.json());
      if (!sessionData) {
        return null;
      }

      const accessToken = this.asString(sessionData.accessToken);
      if (!accessToken) {
        return null;
      }

      const accountId = this.extractCodexAccountId(sessionData);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      if (accountId) {
        headers['ChatGPT-Account-Id'] = accountId;
      }

      const usageResponse = await fetch(this.CODEX_USAGE_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!usageResponse.ok) {
        return null;
      }

      const raw = await usageResponse.json();
      return this.parseCodexUsage(raw);
    } catch {
      return null;
    }
  }

  private static extractCodexAccountId(session: Record<string, unknown>): string | null {
    const direct =
      this.asString(session.account_id) ??
      this.asString(session.accountId) ??
      this.asString(session.active_account_id) ??
      this.asString(session.activeAccountId);

    if (direct) {
      return direct;
    }

    const user = this.asRecord(session.user);
    const userAccountId = user
      ? (this.asString(user.account_id) ??
        this.asString(user.accountId) ??
        this.asString(user.default_account_id))
      : null;

    if (userAccountId) {
      return userAccountId;
    }

    const accounts = Array.isArray(session.accounts) ? session.accounts : [];
    for (const item of accounts) {
      const account = this.asRecord(item);
      if (!account) {
        continue;
      }

      const candidate =
        this.asString(account.account_id) ??
        this.asString(account.id) ??
        this.asString(account.uuid);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  private static parseClaudeUsage(raw: unknown): ClaudeUsage | null {
    const data = this.asRecord(raw);
    if (!data) {
      return null;
    }

    const session = this.extractWindow(data, ['five_hour', 'session', 'primary_window']);
    const weekly = this.extractWindow(data, ['seven_day', 'weekly', 'secondary_window']);

    if (!session && !weekly) {
      return null;
    }

    const sessionPercentage = this.extractPercentage(session, data.session_usage);
    const weeklyPercentage = this.extractPercentage(weekly, data.weekly_usage);
    const max = Math.max(sessionPercentage, weeklyPercentage);

    return {
      plan: this.extractPlanName(data),
      session: {
        percentage: sessionPercentage,
        resetsAt: this.extractResetAt(session),
        used: this.extractUsedValue(session),
        limit: this.extractLimitValue(session),
      },
      weekly: {
        percentage: weeklyPercentage,
        resetsAt: this.extractResetAt(weekly),
        used: this.extractUsedValue(weekly),
        limit: this.extractLimitValue(weekly),
      },
      status: getUsageTone(max),
      lastUpdated: Date.now(),
      raw: data,
    };
  }

  private static parseCodexUsage(raw: unknown): CodexUsage | null {
    const data = this.asRecord(raw);
    if (!data) {
      return null;
    }

    const root = this.extractRateLimitRoot(data);
    const primary =
      this.extractWindow(root, ['primary_window', 'five_hour', 'session']) ??
      this.findWindowInTree(data, ['primary_window', 'five_hour', 'session']);
    const secondary =
      this.extractWindow(root, ['secondary_window', 'seven_day', 'weekly']) ??
      this.findWindowInTree(data, ['secondary_window', 'seven_day', 'weekly']);

    if (!primary && !secondary) {
      return null;
    }

    const sessionPercentage = this.extractPercentage(primary);
    const weeklyPercentage = this.extractPercentage(secondary);
    const max = Math.max(sessionPercentage, weeklyPercentage);

    return {
      session: {
        percentage: sessionPercentage,
        resetsAt: this.extractResetAt(primary),
        used: this.extractUsedValue(primary),
        limit: this.extractLimitValue(primary),
      },
      weekly: {
        percentage: weeklyPercentage,
        resetsAt: this.extractResetAt(secondary),
        used: this.extractUsedValue(secondary),
        limit: this.extractLimitValue(secondary),
      },
      status: getUsageTone(max),
      lastUpdated: Date.now(),
      raw: data,
    };
  }

  private static extractRateLimitRoot(data: Record<string, unknown>): Record<string, unknown> {
    const root =
      this.asRecord(data.rate_limit) ??
      this.asRecord(data.rateLimit) ??
      this.asRecord(data.codex) ??
      this.asRecord(data.usage) ??
      data;
    return root;
  }

  private static findWindowInTree(
    source: Record<string, unknown>,
    keys: string[],
    depth: number = 0,
  ): Record<string, unknown> | null {
    if (depth > 5) {
      return null;
    }

    const direct = this.extractWindow(source, keys);
    if (direct) {
      return direct;
    }

    for (const value of Object.values(source)) {
      const node = this.asRecord(value);
      if (!node) {
        continue;
      }

      const nested = this.findWindowInTree(node, keys, depth + 1);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private static extractWindow(
    source: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> | null {
    for (const key of keys) {
      const candidate = this.asRecord(source[key]);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  private static extractPercentage(
    window: Record<string, unknown> | null,
    fallback?: unknown,
  ): number {
    if (window) {
      const value =
        window.used_percent ??
        window.utilization ??
        window.percentage ??
        window.usedPercentage ??
        window.usage_percent;

      const parsed = this.toPct(value);
      if (parsed > 0 || value === 0) {
        return parsed;
      }
    }

    return this.toPct(fallback);
  }

  private static extractResetAt(window: Record<string, unknown> | null): string | null {
    if (!window) {
      return null;
    }

    const directString = this.asString(
      window.resets_at ?? window.reset_at ?? window.resetsAt ?? window.resetAt ?? null,
    );
    if (directString) {
      return this.toIsoString(directString);
    }

    const directNumber = this.asNumber(
      window.resets_at ?? window.reset_at ?? window.resetsAt ?? window.resetAt ?? null,
    );
    if (directNumber != null) {
      return this.toIsoFromEpoch(directNumber);
    }

    const resetAfterSeconds = this.asNumber(window.reset_after_seconds);
    if (resetAfterSeconds != null) {
      return new Date(Date.now() + resetAfterSeconds * 1000).toISOString();
    }

    return null;
  }

  private static extractUsedValue(window: Record<string, unknown> | null): number | undefined {
    if (!window) {
      return undefined;
    }

    return (
      this.asNumber(
        window.used ?? window.used_count ?? window.used_messages ?? window.used_amount ?? null,
      ) ?? undefined
    );
  }

  private static extractLimitValue(window: Record<string, unknown> | null): number | undefined {
    if (!window) {
      return undefined;
    }

    const directLimit = this.asNumber(window.limit ?? window.total ?? window.max ?? null);
    if (directLimit != null) {
      return directLimit;
    }

    const used = this.asNumber(window.used ?? null);
    const percent = this.asNumber(window.used_percent ?? window.utilization ?? null);
    if (used != null && percent != null && percent > 0) {
      const normalizedPercent = percent <= 1 ? percent * 100 : percent;
      const inferred = Math.round(used / (normalizedPercent / 100));
      return inferred > 0 ? inferred : undefined;
    }

    return undefined;
  }

  private static extractPlanName(data: Record<string, unknown>): string {
    const plan =
      this.asString(data.plan) ??
      this.asString(data.billing_plan) ??
      this.asString(data.tier) ??
      'unknown';

    return plan;
  }

  private static async getClaudeOrgId(): Promise<string | null> {
    const cached = await chrome.storage.local.get(this.CLAUDE_ORG_KEY);
    const fromStorage = this.asString(cached[this.CLAUDE_ORG_KEY]);
    if (fromStorage) {
      return fromStorage;
    }

    try {
      const cookie = await chrome.cookies.get({
        url: 'https://claude.ai',
        name: 'lastActiveOrg',
      });

      if (cookie?.value) {
        const orgId = decodeURIComponent(cookie.value);
        await chrome.storage.local.set({ [this.CLAUDE_ORG_KEY]: orgId });
        return orgId;
      }
    } catch {
      // Cookie access is optional and can fail when permission is absent.
    }

    try {
      const response = await fetch('https://claude.ai/api/organizations', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const orgs = await response.json();
      if (!Array.isArray(orgs) || orgs.length === 0) {
        return null;
      }

      const preferred = orgs.find(
        (org) => !Array.isArray(org?.capabilities) || !org.capabilities.includes('api'),
      );
      const orgId = this.asString(preferred?.uuid) ?? this.asString(orgs[0]?.uuid);

      if (!orgId) {
        return null;
      }

      await chrome.storage.local.set({ [this.CLAUDE_ORG_KEY]: orgId });
      return orgId;
    } catch {
      return null;
    }
  }

  private static toPct(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return 0;
    }

    if (n <= 1) {
      return Math.max(0, Math.min(100, Math.round(n * 100)));
    }

    return Math.max(0, Math.min(100, Math.round(n)));
  }

  private static asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private static asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private static asNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private static toIsoString(value: string): string | null {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return new Date(parsed).toISOString();
  }

  private static toIsoFromEpoch(value: number): string | null {
    const epochMs = value < 1_000_000_000_000 ? value * 1000 : value;
    if (!Number.isFinite(epochMs)) {
      return null;
    }

    return new Date(epochMs).toISOString();
  }
}
