/**
 * Minimal structured logger. Emits one JSON line per event to the console, which
 * Vercel captures and forwards to any log drain. Kept dependency-free.
 *
 * A redaction guard drops values whose KEY looks sensitive, so a careless
 * `log.error("x", { user })` can't leak a token/cookie/email/phone. This is a
 * backstop, not a licence to pass secrets — prefer logging ids, not objects.
 */

type Level = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY =
  /token|secret|cookie|authorization|auth[_-]?key|password|payload|email|phone|webhook/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function emit(level: Level, message: string, fields?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, fields?: Record<string, unknown>) => emit("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit("error", message, fields),
};

// Sentry (or another reporter) can hook in here later without touching call sites.
