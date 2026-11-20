import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createItem,
  getPublicItemById,
  ItemForbiddenError,
  ItemNotFoundError,
  searchPublicItems,
  softDeleteItem,
  updateItem,
} from '../item-service';

const mockPrisma = {
  category: {
    upsert: vi.fn(),
  },
  location: {
    create: vi.fn(),
  },
  report: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  institutionMember: {
    findUnique: vi.fn(),
  },
  item: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock('@lost-found/database', () => ({
  prisma: {
    get category() {
      return mockPrisma.category;
    },
    get location() {
      return mockPrisma.location;
    },
    get report() {
      return mockPrisma.report;
    },
    get auditLog() {
      return mockPrisma.auditLog;
    },
    get institutionMember() {
      return mockPrisma.institutionMember;
    },
    get item() {
      return mockPrisma.item;
    },
  },
}));

const ITEM_OID = '6740a1b2c3d4e5f60718293a';
const INST_OID = '6740a1b2c3d4e5f60718293b';
const OWNER_OID = '6740a1b2c3d4e5f60718293c';
const OTHER_OID = '6740a1b2c3d4e5f60718293d';

function makeSelectedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_OID,
    type: 'FOUND',
    status: 'OPEN',
    title: 'Silver MacBook Air M2',
    publicDescription: 'Found inside a black laptop sleeve at Bengaluru Airport Terminal 2 gate.',
    privateDetails: 'SECRET_IMEI_99887766_WALLPAPER_LADAKH',
    contactPreference: 'IN_APP',
    dateLostOrFound: new Date('2026-11-18T10:00:00.000Z'),
    createdAt: new Date('2026-11-18T12:00:00.000Z'),
    recoveredAt: null,
    isPublished: true,
    reportedByUserId: OWNER_OID,
    institutionId: null,
    category: {
      id: '6740a1b2c3d4e5f607182901',
      slug: 'electronics',
      name: 'Electronics & Gadgets',
      iconName: 'smartphone',
    },
    location: {
      address: 'Kempegowda International Airport',
      landmark: 'Terminal 2 Gate 14',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560300',
    },
    institution: null,
    images: [],
    reports: [{ referenceNumber: 'LFI-F-2026-ABCD1234' }],
    reportedBy: {
      fullName: 'Ananya Iyer',
    },
    ...overrides,
  };
}

describe('item-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an item with report + audit log and NEVER exposes privateDetails in the returned DTO', async () => {
    mockPrisma.category.upsert.mockResolvedValueOnce({
      id: '6740a1b2c3d4e5f607182901',
      slug: 'electronics',
    });
    mockPrisma.location.create.mockResolvedValueOnce({ id: '6740a1b2c3d4e5f607182902' });
    mockPrisma.item.create.mockResolvedValueOnce(makeSelectedRow({ reports: [] }));
    mockPrisma.report.create.mockResolvedValueOnce({});
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    const result = await createItem(
      { id: OWNER_OID, role: 'USER' },
      {
        type: 'FOUND',
        title: 'Silver MacBook Air M2',
        categorySlug: 'electronics',
        dateLostOrFound: new Date(Date.now() - 3600_000).toISOString(),
        publicDescription:
          'Found inside a black laptop sleeve at Bengaluru Airport Terminal 2 gate.',
        privateDetails: 'SECRET_IMEI_99887766_WALLPAPER_LADAKH',
        contactPreference: 'IN_APP',
        location: {
          city: 'Bengaluru',
          state: 'Karnataka',
          landmark: 'Terminal 2 Gate 14',
          postalCode: '560300',
        },
      }
    );

    expect(result.id).toBe(ITEM_OID);
    expect(result.referenceNumber).toMatch(/^LFI-F-\d{4}-[A-F0-9]{8}$/);
    expect(result.hasPrivateVerificationClues).toBe(true);
    expect(result.reportedByDisplayName).toBe('Ananya I.');
    expect(result.canManage).toBe(true);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('SECRET_IMEI_99887766');
    expect(serialized).not.toContain('privateDetails');
    expect(mockPrisma.report.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ITEM_REPORTED',
          entityType: 'Item',
          entityId: ITEM_OID,
        }),
      })
    );
  });

  it('blocks non-members from reporting an item under an institution tenant', async () => {
    mockPrisma.institutionMember.findUnique.mockResolvedValueOnce(null);

    await expect(
      createItem(
        { id: OTHER_OID, role: 'USER' },
        {
          type: 'FOUND',
          title: 'Student ID Card',
          categorySlug: 'documents',
          dateLostOrFound: new Date(Date.now() - 3600_000).toISOString(),
          publicDescription: 'Found a student ID card near the central library entrance.',
          institutionId: INST_OID,
          location: {
            city: 'New Delhi',
            state: 'Delhi',
          },
        }
      )
    ).rejects.toBeInstanceOf(ItemForbiddenError);

    expect(mockPrisma.item.create).not.toHaveBeenCalled();
  });

  it('searches public items without querying or returning privateDetails', async () => {
    mockPrisma.item.findMany.mockResolvedValueOnce([makeSelectedRow()]);
    mockPrisma.item.count.mockResolvedValueOnce(1);

    const response = await searchPublicItems({
      q: 'MacBook',
      type: 'FOUND',
      state: 'Karnataka',
      city: 'Bengaluru',
      page: '1',
      limit: '10',
    });

    expect(response.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(response.items).toHaveLength(1);
    expect(response.items[0].hasPrivateVerificationClues).toBe(true);

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('SECRET_IMEI_99887766');
    expect(serialized).not.toContain('privateDetails');

    const findManyArg = mockPrisma.item.findMany.mock.calls[0][0];
    expect(JSON.stringify(findManyArg.where)).not.toContain('privateDetails');
    expect(findManyArg.where.deletedAt).toBeNull();
    expect(findManyArg.where.isPublished).toBe(true);
  });

  it('hides unpublished items from non-owners and returns sanitized detail to viewers', async () => {
    mockPrisma.item.findFirst.mockResolvedValueOnce(makeSelectedRow({ isPublished: false }));
    await expect(
      getPublicItemById(ITEM_OID, { id: OTHER_OID, role: 'USER' })
    ).rejects.toBeInstanceOf(ItemNotFoundError);

    mockPrisma.item.findFirst.mockResolvedValueOnce(makeSelectedRow({ isPublished: true }));
    const detail = await getPublicItemById(ITEM_OID, null);
    expect(detail.canManage).toBe(false);
    expect(JSON.stringify(detail)).not.toContain('SECRET_IMEI_99887766');
  });

  it('rejects updates and soft-deletes from unauthorized users', async () => {
    mockPrisma.item.findFirst.mockResolvedValueOnce({
      id: ITEM_OID,
      reportedByUserId: OWNER_OID,
      institutionId: null,
      status: 'OPEN',
    });

    await expect(
      updateItem(ITEM_OID, { id: OTHER_OID, role: 'USER' }, { status: 'RECOVERED' })
    ).rejects.toBeInstanceOf(ItemForbiddenError);

    mockPrisma.item.findFirst.mockResolvedValueOnce({
      id: ITEM_OID,
      reportedByUserId: OWNER_OID,
      institutionId: null,
    });

    await expect(
      softDeleteItem(ITEM_OID, { id: OTHER_OID, role: 'USER' })
    ).rejects.toBeInstanceOf(ItemForbiddenError);
  });

  it('allows owner to mark item RECOVERED and soft-delete with audit logs', async () => {
    mockPrisma.item.findFirst.mockResolvedValueOnce({
      id: ITEM_OID,
      reportedByUserId: OWNER_OID,
      institutionId: null,
      status: 'OPEN',
    });
    mockPrisma.item.update.mockResolvedValueOnce(
      makeSelectedRow({ status: 'RECOVERED', recoveredAt: new Date() })
    );
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    const updated = await updateItem(
      ITEM_OID,
      { id: OWNER_OID, role: 'USER' },
      { status: 'RECOVERED' }
    );
    expect(updated.status).toBe('RECOVERED');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ITEM_UPDATED' }),
      })
    );

    mockPrisma.item.findFirst.mockResolvedValueOnce({
      id: ITEM_OID,
      reportedByUserId: OWNER_OID,
      institutionId: null,
    });
    mockPrisma.item.update.mockResolvedValueOnce({});
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    await softDeleteItem(ITEM_OID, { id: OWNER_OID, role: 'USER' });
    expect(mockPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublished: false,
          status: 'CLOSED',
        }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ITEM_DELETED' }),
      })
    );
  });
});
