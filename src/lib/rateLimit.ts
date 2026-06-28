const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (record.count >= maxRequests) {
    return false; // blocked
  }

  record.count++;
  return true; // allowed
}