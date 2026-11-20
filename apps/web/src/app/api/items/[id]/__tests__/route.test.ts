import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemForbiddenError, ItemNotFoundError } from '@/lib/item-service';
import { defaultRateLimitStore } from '@/lib/rate-limit';
import { DELETE, GET, PATCH } from '../route';

const mockAuth = vi.fn();
const mockGetPublicItemById = vi.fn();
const mockUpdateItem = vi.fn();
const mockSoftDeleteItem = vi.fn();

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/item-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/item-service')>();
  return {
    ...actual,
    getPublicItemById: (...args: unknown[]) => mockGetPublicItemById(...args),
    updateItem: (...args: unknown[]) => mockUpdateItem(...args),
    softDeleteItem: (...args: unknown[]) => mockSoftDeleteItem(...args),
  };
});

const ITEM_OID = '6740a1b2c3d4e5f60718293a';

describe('/api/items/[id] Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultRateLimitStore.reset();
  });

  it('GET returns 404 when item does not exist', async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockGetPublicItemById.mockRejectedValueOnce(new ItemNotFoundError());

    const req = new Request(`http://localhost:3000/api/items/${ITEM_OID}`);
    const res = await GET(req, { params: Promise.resolve({ id: ITEM_OID }) });
    expect(res.status).toBe(404);
  });

  it('PATCH returns 403 when non-owner tries to update an item', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'intruder', role: 'USER' } });
    mockUpdateItem.mockRejectedValueOnce(new ItemForbiddenError());

    const req = new Request(`http://localhost:3000/api/items/${ITEM_OID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RECOVERED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: ITEM_OID }) });
    expect(res.status).toBe(403);
  });

  it('DELETE returns 200 when owner soft-deletes an item', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'owner-1', role: 'USER' } });
    mockSoftDeleteItem.mockResolvedValueOnce(undefined);

    const req = new Request(`http://localhost:3000/api/items/${ITEM_OID}`, {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: ITEM_OID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ deleted: true });
  });
});
