import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

const mockRunCommandRaw = vi.fn();

vi.mock('@lost-found/database', () => ({
  prisma: {
    get $runCommandRaw() {
      return mockRunCommandRaw;
    },
  },
}));

describe('Health Check Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 healthy status when MongoDB is reachable', async () => {
    mockRunCommandRaw.mockResolvedValueOnce({ ok: 1 });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(mockRunCommandRaw).toHaveBeenCalledWith({ ping: 1 });

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('connected');
    expect(data.checks.database.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(data.checks.memory).toBeDefined();
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('returns 503 unhealthy status without leaking database credentials when ping fails', async () => {
    mockRunCommandRaw.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED mongodb+srv://admin:secretpass@cluster0.mongodb.net/lost_found')
    );

    const response = await GET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database.status).toBe('error');
    expect(data.checks.database.message).toBe('Database connectivity check failed');

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain('secretpass');
    expect(serialized).not.toContain('cluster0.mongodb.net');
    expect(serialized).not.toContain('ECONNREFUSED');
  });
});
