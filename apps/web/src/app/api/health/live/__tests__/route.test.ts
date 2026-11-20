import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('Liveness Probe Route Handler', () => {
  it('returns 200 ok with uptime and timestamp', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(typeof data.timestamp).toBe('string');
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
