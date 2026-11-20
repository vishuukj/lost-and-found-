import { describe, it, expect } from 'vitest';
import { formatLogEntry, redactLogContext } from '../logger';

describe('Structured Logger & Redaction', () => {
  it('redacts sensitive keys recursively', () => {
    const redacted = redactLogContext({
      userId: 'user-123',
      password: 'plain-password',
      accessToken: 'ya29.secret-token',
      nested: {
        refreshToken: 'refresh-secret',
        privateDetails: 'IMEI 1234567890',
        safeField: 'visible',
      },
    });

    expect(redacted).toEqual({
      userId: 'user-123',
      password: '[REDACTED]',
      accessToken: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        privateDetails: '[REDACTED]',
        safeField: 'visible',
      },
    });
  });

  it('scrubs credentials embedded in database connection URLs', () => {
    const formatted = formatLogEntry('error', 'Failed to connect', {
      error: new Error('mongodb+srv://admin:supersecret@cluster0.mongodb.net/lost_found_india'),
    });

    expect(formatted).not.toContain('supersecret');
    expect(formatted).toContain(
      'mongodb+srv://admin:[REDACTED]@cluster0.mongodb.net/lost_found_india'
    );
  });
});
