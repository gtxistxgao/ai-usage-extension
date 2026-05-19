export interface UsageLimit {
  percentage: number;
  resetsAt: string | null;
  used?: number;
  limit?: number;
}

export interface ClaudeUsage {
  plan: string;
  session: UsageLimit;
  weekly: UsageLimit;
  status: 'ok' | 'warning' | 'critical';
  lastUpdated: number;
  raw?: Record<string, unknown>;
}

export interface CodexUsage {
  session: UsageLimit;
  weekly: UsageLimit;
  status: 'ok' | 'warning' | 'critical';
  lastUpdated: number;
  raw?: Record<string, unknown>;
}

export interface UsageState {
  claude?: ClaudeUsage;
  codex?: CodexUsage;
}

export interface ExtensionMessage {
  type: string;
  payload?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}
