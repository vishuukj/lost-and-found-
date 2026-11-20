export type LogLevel = 'info' | 'warn' | 'error';

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|authorization|cookie|privateDetails|database_url|databaseurl|connectionstring|apikey|api_key/i;

const CREDENTIAL_URL_PATTERN = /([a-z][a-z0-9+.-]*:\/\/[^:\s/]+:)([^@\s/]+)(@)/gi;

function sanitizeString(value: string): string {
  return value.replace(CREDENTIAL_URL_PATTERN, '$1[REDACTED]$3');
}

export function redactLogContext(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return '[TRUNCATED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLogContext(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactLogContext(entryValue, depth + 1);
      }
    }
    return sanitized;
  }

  return String(value);
}

export function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    service: 'lost-found-web',
    message: sanitizeString(message),
  };

  if (context && Object.keys(context).length > 0) {
    payload.context = redactLogContext(context);
  }

  return JSON.stringify(payload);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    console.info(formatLogEntry('info', message, context));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatLogEntry('warn', message, context));
  },
  error(message: string, context?: Record<string, unknown>): void {
    console.error(formatLogEntry('error', message, context));
  },
};
