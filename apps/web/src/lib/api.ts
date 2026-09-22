const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'board.session';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // private window, blocked storage
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* non-fatal: the session simply does not persist across reloads */
  }
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? res.statusText, body.code);
  }
  return body as T;
}

export interface TaskSummary {
  id: string;
  type: 'bounty' | 'cohort';
  status: string;
  title: string;
  description: string;
  skillTags: string[];
  tokenKind: string;
  totalAmount: string;
  durationSeconds: number | null;
  reviewCadence: string | null;
  funder: { stacksAddress: string; displayName: string | null };
}

export interface StreamStatus {
  ref: string;
  state: 'active' | 'paused' | 'stopped' | 'completed';
  disbursed: string;
  remaining: string;
  ratePerSecond: string;
  startedAt: number;
  endsAt: number;
}
