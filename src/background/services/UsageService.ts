import { STORAGE_KEYS } from '../../shared/constants';
import { ClaudeUsage, CodexUsage, ModelUsage, UsageLimit, UsageState } from '../../shared/types';
import { clampPercent, getUsageTone } from '../../shared/utils';

const ENDPOINTS = {
  claudeOrgs: 'https://claude.ai/api/organizations',
  claudeUsage: (orgId: string) => `https://claude.ai/api/organizations/${orgId}/usage`,
  codexSession: 'https://chatgpt.com/api/auth/session',
  codexUsage: 'https://chatgpt.com/backend-api/wham/usage',
} as const;

const JSON_HEADERS = { Accept: 'application/json' } as const;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return value.length > 0 ? value : null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const firstString = (...candidates: unknown[]): string | null => {
  for (const c of candidates) {
    const s = readString(c);
    if (s) return s;
  }
  return null;
};

const buildLimit = (percent: number | null, resetsAt: string | null): UsageLimit => ({
  percentage: clampPercent(percent ?? 0),
  resetsAt,
});

const finalize = <T extends { session: UsageLimit; weekly: UsageLimit }>(payload: T) => ({
  ...payload,
  status: getUsageTone(Math.max(payload.session.percentage, payload.weekly.percentage)),
  lastUpdated: Date.now(),
});

/** Turn a model slug like `gpt-5-codex` or `opus` into a display label. */
const prettifyModelName = (slug: string): string =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => (word === 'gpt' ? 'GPT' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
    .replace(/\bGPT (\d)/g, 'GPT-$1');

/* -------------------- Claude -------------------- */

const claudeWindowFrom = (window: unknown): UsageLimit => {
  if (!isObject(window)) return buildLimit(0, null);
  return buildLimit(readNumber(window.utilization), readString(window.resets_at));
};

/**
 * Model-scoped windows arrive as extra top-level keys alongside the account
 * windows, e.g. `seven_day_opus` for the Opus weekly limit.
 */
const CLAUDE_WINDOW_PREFIXES: Array<[prefix: string, tag: string]> = [
  ['five_hour_', '5h'],
  ['seven_day_', '7d'],
];

const CLAUDE_WINDOW_LABELS: Record<string, string> = {
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
  oauth_apps: 'Claude Code',
};

const claudeModelUsages = (raw: Json): ModelUsage[] => {
  const models: ModelUsage[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (!isObject(value) || readNumber(value.utilization) === null) continue;

    const match = CLAUDE_WINDOW_PREFIXES.find(([prefix]) => key.startsWith(prefix));
    if (!match) continue;

    const slug = key.slice(match[0].length);
    if (!slug) continue;

    const label = CLAUDE_WINDOW_LABELS[slug] ?? prettifyModelName(slug);
    models.push({ id: key, label: `${label} · ${match[1]}`, limit: claudeWindowFrom(value) });
  }

  return models;
};

const buildClaudeUsage = (raw: Json | null): ClaudeUsage | null => {
  if (!raw) return null;

  return {
    plan: 'unknown',
    ...finalize({
      session: claudeWindowFrom(raw.five_hour),
      weekly: claudeWindowFrom(raw.seven_day),
    }),
    models: claudeModelUsages(raw),
    raw,
  };
};

const resolveOrgFromList = (orgs: unknown): string | null => {
  if (!Array.isArray(orgs) || orgs.length === 0) return null;

  for (const entry of orgs) {
    if (!isObject(entry)) continue;
    const caps = Array.isArray(entry.capabilities) ? entry.capabilities : [];
    if (caps.includes('api')) continue;
    const id = readString(entry.uuid);
    if (id) return id;
  }

  const first = isObject(orgs[0]) ? readString(orgs[0].uuid) : null;
  return first;
};

/* -------------------- Codex -------------------- */

type CodexSessionInfo = { accessToken: string; accountId: string | null };

const codexResetTimestamp = (window: Json): string | null => {
  const epochSeconds = readNumber(window.reset_at);
  if (epochSeconds !== null) {
    return new Date(epochSeconds * 1000).toISOString();
  }

  const afterSeconds = readNumber(window.reset_after_seconds);
  if (afterSeconds !== null) {
    return new Date(Date.now() + afterSeconds * 1000).toISOString();
  }

  return null;
};

const codexWindowFrom = (window: unknown): UsageLimit => {
  if (!isObject(window)) return buildLimit(0, null);
  return buildLimit(readNumber(window.used_percent), codexResetTimestamp(window));
};

/** Containers the usage payload may use for a per-model breakdown. */
const CODEX_BREAKDOWN_KEYS = [
  'rate_limits',
  'model_rate_limits',
  'additional_rate_limits',
  'model_limits',
  'usage_breakdown',
  'models',
] as const;

const codexEntryName = (entry: Json): string | null =>
  firstString(entry.model, entry.model_slug, entry.name, entry.limit_name, entry.label, entry.id);

/** Turn a window's duration into a `5h` / `7d` style tag, if present. */
const codexWindowTag = (window: Json, fallback: string): string => {
  const minutes = readNumber(window.window_minutes) ?? readNumber(window.window_duration_minutes);
  if (minutes === null || minutes <= 0) return fallback;
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
};

const pushCodexModel = (models: ModelUsage[], id: string, name: string, entry: Json): void => {
  const label = prettifyModelName(name);

  // The entry may itself be a single rate-limit window…
  if (readNumber(entry.used_percent) !== null) {
    models.push({
      id,
      label: `${label} · ${codexWindowTag(entry, '5h')}`,
      limit: codexWindowFrom(entry),
    });
    return;
  }

  // …or wrap primary/secondary windows like the account-level rate_limit.
  const windows: Array<[unknown, string]> = [
    [entry.primary_window, '5h'],
    [entry.secondary_window, '7d'],
  ];
  for (const [window, fallbackTag] of windows) {
    if (!isObject(window) || readNumber(window.used_percent) === null) continue;
    models.push({
      id: `${id}:${fallbackTag}`,
      label: `${label} · ${codexWindowTag(window, fallbackTag)}`,
      limit: codexWindowFrom(window),
    });
  }
};

const codexModelUsages = (raw: Json): ModelUsage[] => {
  const models: ModelUsage[] = [];

  for (const key of CODEX_BREAKDOWN_KEYS) {
    const container = raw[key];

    if (Array.isArray(container)) {
      container.forEach((entry, index) => {
        if (!isObject(entry)) return;
        const name = codexEntryName(entry);
        if (!name) return;
        pushCodexModel(models, `${key}[${index}]`, name, entry);
      });
    } else if (isObject(container)) {
      for (const [name, entry] of Object.entries(container)) {
        if (!isObject(entry)) continue;
        pushCodexModel(models, `${key}.${name}`, name, entry);
      }
    }
  }

  return models;
};

const buildCodexUsage = (raw: Json | null): CodexUsage | null => {
  if (!raw) return null;
  const rate = isObject(raw.rate_limit) ? raw.rate_limit : null;

  return {
    ...finalize({
      session: codexWindowFrom(rate?.primary_window),
      weekly: codexWindowFrom(rate?.secondary_window),
    }),
    models: codexModelUsages(raw),
    raw,
  };
};

const accountIdFromSession = (session: Json): string | null => {
  const direct = firstString(
    session.account_id,
    session.accountId,
    session.active_account_id,
    session.activeAccountId,
  );
  if (direct) return direct;

  if (isObject(session.user)) {
    const fromUser = firstString(
      session.user.account_id,
      session.user.accountId,
      session.user.default_account_id,
    );
    if (fromUser) return fromUser;
  }

  if (Array.isArray(session.accounts)) {
    for (const entry of session.accounts) {
      if (!isObject(entry)) continue;
      const id = firstString(entry.account_id, entry.id, entry.uuid);
      if (id) return id;
    }
  }

  return null;
};

/* -------------------- HTTP -------------------- */

const fetchJson = async (
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: Json } | { ok: false; status: number }> => {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const payload = (await response.json()) as unknown;
  return { ok: true, data: (isObject(payload) ? payload : { value: payload }) as Json };
};

const fetchJsonRaw = async (url: string, init?: RequestInit): Promise<unknown> => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: JSON_HEADERS,
    ...init,
  });
  if (!response.ok) return null;
  return response.json();
};

/* -------------------- Service -------------------- */

export class UsageService {
  static async getUsageState(): Promise<UsageState> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.usageState);
    return (stored[STORAGE_KEYS.usageState] ?? {}) as UsageState;
  }

  static async saveUsageState(state: UsageState): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.usageState]: state });
  }

  static async refreshAllUsage(): Promise<UsageState> {
    const [claude, codex] = await Promise.all([
      this.fetchClaudeUsage().catch(() => null),
      this.fetchCodexUsage().catch(() => null),
    ]);

    const next = await this.getUsageState();
    if (claude) next.claude = claude;
    if (codex) next.codex = codex;

    await this.saveUsageState(next);
    return next;
  }

  static async fetchClaudeUsage(): Promise<ClaudeUsage | null> {
    const orgId = await this.resolveClaudeOrgId();
    if (!orgId) return null;

    const result = await fetchJson(ENDPOINTS.claudeUsage(orgId));
    if (!result.ok) {
      if (result.status === 401 || result.status === 403) {
        await chrome.storage.local.remove(STORAGE_KEYS.claudeOrgId);
      }
      return null;
    }

    return buildClaudeUsage(result.data);
  }

  static async fetchCodexUsage(): Promise<CodexUsage | null> {
    const session = await this.fetchCodexSession();
    if (!session) return null;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
    };
    if (session.accountId) {
      headers['ChatGPT-Account-Id'] = session.accountId;
    }

    const result = await fetchJson(ENDPOINTS.codexUsage, { headers });
    if (!result.ok) return null;

    return buildCodexUsage(result.data);
  }

  private static async fetchCodexSession(): Promise<CodexSessionInfo | null> {
    const payload = await fetchJsonRaw(ENDPOINTS.codexSession);
    if (!isObject(payload)) return null;

    const accessToken = readString(payload.accessToken);
    if (!accessToken) return null;

    return { accessToken, accountId: accountIdFromSession(payload) };
  }

  private static async resolveClaudeOrgId(): Promise<string | null> {
    const cached = await chrome.storage.local.get(STORAGE_KEYS.claudeOrgId);
    const stored = readString(cached[STORAGE_KEYS.claudeOrgId]);
    if (stored) return stored;

    const fromCookie = await this.claudeOrgFromCookie();
    if (fromCookie) {
      await chrome.storage.local.set({ [STORAGE_KEYS.claudeOrgId]: fromCookie });
      return fromCookie;
    }

    const orgs = await fetchJsonRaw(ENDPOINTS.claudeOrgs);
    const fromApi = resolveOrgFromList(orgs);
    if (fromApi) {
      await chrome.storage.local.set({ [STORAGE_KEYS.claudeOrgId]: fromApi });
    }
    return fromApi;
  }

  private static async claudeOrgFromCookie(): Promise<string | null> {
    try {
      const cookie = await chrome.cookies.get({
        url: 'https://claude.ai',
        name: 'lastActiveOrg',
      });
      const value = cookie?.value;
      return value ? decodeURIComponent(value) : null;
    } catch {
      return null;
    }
  }
}
