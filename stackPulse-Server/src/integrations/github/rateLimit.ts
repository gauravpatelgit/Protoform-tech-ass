// Last rate-limit headers GitHub returned, shared by every outbound call.
export const rateLimitState = {
  limit: null as number | null,
  remaining: null as number | null,
  resetAt: null as number | null,
  blockedUntil: 0,
};

export function recordRateLimit(headers: Headers) {
  const limit = Number(headers.get("x-ratelimit-limit"));
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (Number.isFinite(limit) && limit > 0) rateLimitState.limit = limit;
  if (remaining !== null && Number.isFinite(Number(remaining))) rateLimitState.remaining = Number(remaining);
  if (Number.isFinite(reset) && reset > 0) rateLimitState.resetAt = reset * 1000;
}

export function blockFor(seconds: number) {
  rateLimitState.blockedUntil = Date.now() + seconds * 1000;
}

// Seconds until calls are allowed again, or 0 when GitHub can be called.
export function secondsUntilAvailable(now = Date.now()): number {
  if (now < rateLimitState.blockedUntil) return Math.ceil((rateLimitState.blockedUntil - now) / 1000);
  const { remaining, resetAt } = rateLimitState;
  if (remaining === 0 && resetAt !== null && now < resetAt) return Math.ceil((resetAt - now) / 1000);
  return 0;
}

// Enrichment is optional work: skip it once less than 10% of the quota is left.
export function hasBudgetForEnrichment(): boolean {
  const { limit, remaining } = rateLimitState;
  if (secondsUntilAvailable() > 0) return false;
  if (limit === null || remaining === null) return true;
  return remaining / limit >= 0.1;
}

export function resetRateLimitState() {
  Object.assign(rateLimitState, { limit: null, remaining: null, resetAt: null, blockedUntil: 0 });
}
