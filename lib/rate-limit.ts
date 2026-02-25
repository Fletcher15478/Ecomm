/**
 * In-memory rate limit for checkout. For production on Render with multiple
 * instances, use Redis or similar; this prevents abuse per instance.
 */
const checkoutAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

export function checkCheckoutRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = checkoutAttempts.get(identifier);
  if (!entry) {
    checkoutAttempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    checkoutAttempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) return false;
  return true;
}

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkCheckoutRateLimitFromRequest(request: Request): boolean {
  return checkCheckoutRateLimit(getClientIdentifier(request));
}
