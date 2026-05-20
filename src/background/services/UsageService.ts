import { STORAGE_KEYS } from '../../shared/constants';
import { ClaudeUsage, CodexUsage, UsageLimit, UsageState } from '../../shared/types';
import { clampPercent, getUsageTone } from '../../shared/utils';

/* -------------------------------------------------------------------------- */
/*  Provider response shapes                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Claude usage endpoint (`/api/organizations/{orgId}/usage`).
 *
 * Both `five_hour` (5-hour session) and `seven_day` (weekly) report
 * `utilization` as an already-scaled percentage in 0–100.
 */
interface ClaudeUsageResponse {
  five_hour?: ClaudeWindow | null;
  seven_day?: ClaudeWindow | null;
  // The plan name isn't part of this endpoint's payload today — keep `unknown`.
}

interface ClaudeWindow {
  utilization?: number | null;
  resets_at?: string | null;
}

/**
 * Codex usage endpoint (`/backend-api/wham/usage`).
 *
 * `primary_window` = session, `secondary_window` = weekly.
 * `used_percent` is in 0–100. `reset_at` is a Unix epoch in seconds.
 */
interface CodexUsageResponse {
  plan_type?: string | null;
  rate_limit?: {
    primary_window?: CodexWindow | null;
    secondary_window?: CodexWindow | null;
  } | null;
}

interface CodexWindow {
  used_percent?: number | null;
  reset_at?: number | null;
  reset_after_seconds?: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Service                                                                   */
/* -------------------------------------------------------------------------- */

export class UsageService {
  private static readonly STORAGE_KEY = STORAGE_KEYS.usageState;
  private static readonly CLAUDE_ORG_KEY = STORAGE_KEYS.claudeOrgId;

  private static readonly CLAUDE_USAGE_ENDPOINT = (orgId: string) =>
    `https://claude.ai/api/organizations/${orgId}/usage`;
  private static readonly CLAUDE_ORGS_ENDPOINT = 'https://claude.ai/api/organizations';
  private static readonly CODEX_SESSION_ENDPOINT = 'https://chatgpt.com/api/auth/session';
  private static readonly CODEX_USAGE_ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage';

  static async getUsageState(): Promise<UsageState> {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    return (data[this.STORAGE_KEY] ?? {}) as UsageState;
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
    if (claude) state.claude = claude;
    if (codex) state.codex = codex;

    await this.saveUsageState(state);
    return state;
  }

  /* ---- Claude --------------------------------------------------------- */

  static async fetchClaudeUsage(): Promise<ClaudeUsage | null> {
    const orgId = await this.getClaudeOrgId();
    if (!orgId) return null;

    const response = await fetch(this.CLAUDE_USAGE_ENDPOINT(orgId), {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      // Invalidate the cached org if the cached id is no longer authorised.
      if (response.status === 401 || response.status === 403) {
        await chrome.storage.local.remove(this.CLAUDE_ORG_KEY);
      }
      return null;
    }

    return this.parseClaudeUsage((await response.json()) as ClaudeUsageResponse);
  }

  private static parseClaudeUsage(raw: ClaudeUsageResponse | null): ClaudeUsage | null {
    if (!raw) return null;

    const session = this.claudeWindow(raw.five_hour);
    const weekly = this.claudeWindow(raw.seven_day);

    return {
      plan: 'unknown',
      session,
      weekly,
      status: getUsageTone(Math.max(session.percentage, weekly.percentage)),
      lastUpdated: Date.now(),
      raw: raw as unknown as Record<string, unknown>,
    };
  }

  private static claudeWindow(window: ClaudeWindow | null | undefined): UsageLimit {
    return {
      percentage: clampPercent(window?.utilization ?? 0),
      resetsAt: window?.resets_at ?? null,
    };
  }

  /* ---- Codex ---------------------------------------------------------- */

  static async fetchCodexUsage(): Promise<CodexUsage | null> {
    const session = await this.fetchCodexSession();
    if (!session) return null;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    };
    if (session.accountId) {
      headers['ChatGPT-Account-Id'] = session.accountId;
    }

    const response = await fetch(this.CODEX_USAGE_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) return null;

    return this.parseCodexUsage((await response.json()) as CodexUsageResponse);
  }

  private static parseCodexUsage(raw: CodexUsageResponse | null): CodexUsage | null {
    if (!raw) return null;

    const session = this.codexWindow(raw.rate_limit?.primary_window);
    const weekly = this.codexWindow(raw.rate_limit?.secondary_window);

    return {
      session,
      weekly,
      status: getUsageTone(Math.max(session.percentage, weekly.percentage)),
      lastUpdated: Date.now(),
      raw: raw as unknown as Record<string, unknown>,
    };
  }

  private static codexWindow(window: CodexWindow | null | undefined): UsageLimit {
    return {
      percentage: clampPercent(window?.used_percent ?? 0),
      resetsAt: this.codexResetsAt(window),
    };
  }

  private static codexResetsAt(window: CodexWindow | null | undefined): string | null {
    if (!window) return null;

    if (typeof window.reset_at === 'number' && Number.isFinite(window.reset_at)) {
      // `reset_at` is Unix epoch in seconds.
      return new Date(window.reset_at * 1000).toISOString();
    }

    if (
      typeof window.reset_after_seconds === 'number' &&
      Number.isFinite(window.reset_after_seconds)
    ) {
      return new Date(Date.now() + window.reset_after_seconds * 1000).toISOString();
    }

    return null;
  }

  /* ---- Codex session --------------------------------------------------- */

  private static async fetchCodexSession(): Promise<{
    accessToken: string;
    accountId: string | null;
  } | null> {
    const response = await fetch(this.CODEX_SESSION_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') return null;

    const accessToken = this.asString(data.accessToken);
    if (!accessToken) return null;

    return { accessToken, accountId: this.extractCodexAccountId(data) };
  }

  private static extractCodexAccountId(session: Record<string, unknown>): string | null {
    const direct =
      this.asString(session.account_id) ??
      this.asString(session.accountId) ??
      this.asString(session.active_account_id) ??
      this.asString(session.activeAccountId);
    if (direct) return direct;

    const user = this.asRecord(session.user);
    if (user) {
      const fromUser =
        this.asString(user.account_id) ??
        this.asString(user.accountId) ??
        this.asString(user.default_account_id);
      if (fromUser) return fromUser;
    }

    const accounts = Array.isArray(session.accounts) ? session.accounts : [];
    for (const item of accounts) {
      const account = this.asRecord(item);
      if (!account) continue;
      const id =
        this.asString(account.account_id) ??
        this.asString(account.id) ??
        this.asString(account.uuid);
      if (id) return id;
    }

    return null;
  }

  /* ---- Claude org id resolution --------------------------------------- */

  private static async getClaudeOrgId(): Promise<string | null> {
    const cached = await chrome.storage.local.get(this.CLAUDE_ORG_KEY);
    const fromStorage = this.asString(cached[this.CLAUDE_ORG_KEY]);
    if (fromStorage) return fromStorage;

    // Preferred path: the cookie set by claude.ai once a user has picked an org.
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
      // The cookie permission is optional; fall through to the API.
    }

    // Fallback: pick the first non-API org from the organizations endpoint.
    const response = await fetch(this.CLAUDE_ORGS_ENDPOINT, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const orgs = await response.json();
    if (!Array.isArray(orgs) || orgs.length === 0) return null;

    const preferred = orgs.find(
      (org) => !Array.isArray(org?.capabilities) || !org.capabilities.includes('api'),
    );
    const orgId = this.asString(preferred?.uuid) ?? this.asString(orgs[0]?.uuid);
    if (!orgId) return null;

    await chrome.storage.local.set({ [this.CLAUDE_ORG_KEY]: orgId });
    return orgId;
  }

  /* ---- Small helpers --------------------------------------------------- */

  private static asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private static asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
