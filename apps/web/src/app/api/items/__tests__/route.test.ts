import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import { defaultRateLimitStore } from '@/lib/rate-limit';
import { GET, POST } from '../route';

const mockAuth = vi.fn();
const mockSearchPublicItems = vi.fn();
const mockCreateItem = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/item-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/item-service')>();
  return {
    ...actual,
    searchPublicItems: (...args: unknown[]) => mockSearchPublicItems(...args),
    createItem: (...args: unknown[]) => mockCreateItem(...args),
  };
});

describe('/api/items Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultRateLimitStore.reset();
  });

  it('GET returns paginated public items with rate-limit headers', async () => {
    mockSearchPublicItems.mockResolvedValueOnce({
      items: [
        {
          id: '6740a1b2c3d4e5f60718293a',
          type: 'LOST',
          status: 'OPEN',
          title: 'Blue Backpack',
          publicDescription: 'Lost near Pune Junction railway platform 2.',
          dateLostOrFound: '2026-11-18T10:00:00.000Z',
          createdAt: '2026-11-18T11:00:00.000Z',
          category: { id: 'c1', slug: 'wallets_bags', name: 'Wallets, Purses & Bags' },
          location: { city: 'Pune', state: 'Maharashtra' },
          hasPrivateVerificationClues: true,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const req = new Request('http://localhost:3000/api/items?type=LOST&state=Maharashtra', {
      headers: { 'x-forwarded-for': '203.0.113.50' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBeTruthy();

    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(mockSearchPublicItems).toHaveBeenCalledWith({
      type: 'LOST',
      state: 'Maharashtra',
    });
  });

  it('GET returns 400 when search query parameters fail validation', async () => {
    mockSearchPublicItems.mockRejectedValueOnce(
      new ZodError([{ code: 'custom', path: ['state'], message: 'Invalid state' }])
    );

    const req = new Request('http://localhost:3000/api/items?state=InvalidState');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Item' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('POST returns 201 and created public item for authenticated user', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'user-1', role: 'USER' },
    });
    mockCreateItem.mockResolvedValueOnce({
      id: '6740a1b2c3d4e5f60718293a',
      type: 'FOUND',
      status: 'OPEN',
      title: 'Black Earbuds Case',
      publicDescription: 'Found a black earbuds charging case at Chennai Central Metro.',
      dateLostOrFound: '2026-11-18T10:00:00.000Z',
      createdAt: '2026-11-18T11:00:00.000Z',
      category: { id: 'c1', slug: 'electronics', name: 'Electronics & Gadgets' },
      location: { city: 'Chennai', state: 'Tamil Nadu' },
      images: [],
      reportedByDisplayName: 'Karthik R.',
      hasPrivateVerificationClues: true,
      canManage: true,
    });

    const req = new Request('http://localhost:3000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.51',
      },
      body: JSON.stringify({
        type: 'FOUND',
        title: 'Black Earbuds Case',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item.id).toBe('6740a1b2c3d4e5f60718293a');
  });
});
