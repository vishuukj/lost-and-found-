import crypto from 'node:crypto';
import { prisma, type Prisma } from '@lost-found/database';
import {
  CreateItemInputSchema,
  ITEM_CATEGORIES,
  ItemIdParamSchema,
  ItemSearchQuerySchema,
  UpdateItemInputSchema,
  type ContactPreference,
  type ItemStatus,
  type ItemType,
  type PaginatedItemsResponse,
  type PublicItemDetail,
  type PublicItemSummary,
  type UserRole,
} from '@lost-found/shared';
import { logger } from '@/lib/logger';

export interface ItemActor {
  id: string;
  role: UserRole;
}

export class ItemNotFoundError extends Error {
  constructor() {
    super('Item not found.');
    this.name = 'ItemNotFoundError';
  }
}

export class ItemForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'ItemForbiddenError';
  }
}

export class ItemServiceError extends Error {
  constructor(message = 'Unable to process item request right now.') {
    super(message);
    this.name = 'ItemServiceError';
  }
}

const PUBLIC_ITEM_SELECT = {
  id: true,
  type: true,
  status: true,
  title: true,
  publicDescription: true,
  privateDetails: true, // Used ONLY server-side to compute boolean hasPrivateVerificationClues; NEVER serialized
  contactPreference: true,
  dateLostOrFound: true,
  createdAt: true,
  recoveredAt: true,
  isPublished: true,
  reportedByUserId: true,
  institutionId: true,
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      iconName: true,
    },
  },
  location: {
    select: {
      address: true,
      landmark: true,
      city: true,
      state: true,
      postalCode: true,
    },
  },
  institution: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      city: true,
      state: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  reports: {
    select: {
      referenceNumber: true,
    },
    orderBy: { createdAt: 'asc' as const },
    take: 1,
  },
  reportedBy: {
    select: {
      fullName: true,
    },
  },
} satisfies Prisma.ItemSelect;

type SelectedItemRow = Prisma.ItemGetPayload<{ select: typeof PUBLIC_ITEM_SELECT }>;

function formatReporterDisplayName(fullName: string, hasInstitution: boolean): string {
  if (hasInstitution) {
    return 'Verified Institutional Desk';
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'Verified Member';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function generateReferenceNumber(type: ItemType): string {
  const year = new Date().getFullYear();
  const prefix = type === 'LOST' ? 'LFI-L' : 'LFI-F';
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${year}-${suffix}`;
}

function toPublicItemSummary(row: SelectedItemRow): PublicItemSummary {
  const primaryImage = row.images.find((img) => img.isPrimary) ?? row.images[0] ?? null;

  return {
    id: row.id,
    type: row.type as ItemType,
    status: row.status as ItemStatus,
    title: row.title,
    publicDescription: row.publicDescription,
    dateLostOrFound: row.dateLostOrFound.toISOString(),
    createdAt: row.createdAt.toISOString(),
    recoveredAt: row.recoveredAt ? row.recoveredAt.toISOString() : null,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      iconName: row.category.iconName,
    },
    location: {
      city: row.location.city,
      state: row.location.state,
      landmark: row.location.landmark,
      postalCode: row.location.postalCode,
    },
    institution: row.institution
      ? {
          id: row.institution.id,
          name: row.institution.name,
          code: row.institution.code,
          type: row.institution.type,
          city: row.institution.city,
          state: row.institution.state,
        }
      : null,
    primaryImage: primaryImage
      ? {
          id: primaryImage.id,
          url: primaryImage.url,
          isPrimary: primaryImage.isPrimary,
        }
      : null,
    referenceNumber: row.reports[0]?.referenceNumber ?? null,
    hasPrivateVerificationClues: Boolean(row.privateDetails && row.privateDetails.trim().length > 0),
  };
}

function toPublicItemDetail(row: SelectedItemRow, canManage: boolean): PublicItemDetail {
  return {
    ...toPublicItemSummary(row),
    contactPreference: (row.contactPreference as ContactPreference | null) ?? null,
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.isPrimary,
    })),
    address: row.location.address,
    reportedByDisplayName: formatReporterDisplayName(
      row.reportedBy.fullName,
      Boolean(row.institution)
    ),
    canManage,
  };
}

async function verifyInstitutionMembership(
  institutionId: string,
  actor: ItemActor
): Promise<boolean> {
  if (actor.role === 'PLATFORM_ADMIN') {
    return true;
  }

  const membership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: {
        institutionId,
        userId: actor.id,
      },
    },
    select: {
      isActive: true,
    },
  });

  return Boolean(membership?.isActive);
}

async function canActorManageItem(
  item: { reportedByUserId: string; institutionId: string | null },
  actor?: ItemActor | null
): Promise<boolean> {
  if (!actor) {
    return false;
  }

  if (actor.role === 'PLATFORM_ADMIN') {
    return true;
  }

  if (item.reportedByUserId === actor.id) {
    return true;
  }

  if (item.institutionId) {
    return verifyInstitutionMembership(item.institutionId, actor);
  }

  return false;
}

export async function createItem(
  actor: ItemActor,
  rawInput: unknown
): Promise<PublicItemDetail> {
  const parsed = CreateItemInputSchema.parse(rawInput);

  if (parsed.institutionId) {
    const isMember = await verifyInstitutionMembership(parsed.institutionId, actor);
    if (!isMember) {
      throw new ItemForbiddenError(
        'You are not an active staff member of the specified institution.'
      );
    }
  }

  const categoryDef = ITEM_CATEGORIES.find((cat) => cat.id === parsed.categorySlug);
  if (!categoryDef) {
    throw new ItemServiceError('Invalid item category.');
  }

  const referenceNumber = generateReferenceNumber(parsed.type);

  try {
    // Sequential writes ensure full compatibility with both standalone MongoDB and Replica Sets/Atlas
    const category = await prisma.category.upsert({
      where: { slug: categoryDef.id },
      update: {},
      create: {
        slug: categoryDef.id,
        name: categoryDef.name,
        description: categoryDef.description,
        isActive: true,
      },
    });

    const location = await prisma.location.create({
      data: {
        address: parsed.location.address ?? null,
        landmark: parsed.location.landmark ?? null,
        city: parsed.location.city,
        state: parsed.location.state,
        postalCode: parsed.location.postalCode ?? null,
        latitude: parsed.location.latitude ?? null,
        longitude: parsed.location.longitude ?? null,
      },
    });

    const createdItem = await prisma.item.create({
      data: {
        type: parsed.type,
        status: 'OPEN',
        title: parsed.title,
        categoryId: category.id,
        locationId: location.id,
        institutionId: parsed.institutionId ?? null,
        reportedByUserId: actor.id,
        dateLostOrFound: parsed.dateLostOrFound,
        publicDescription: parsed.publicDescription,
        privateDetails: parsed.privateDetails ?? null,
        contactPreference: parsed.contactPreference,
        isPublished: true,
      },
      select: PUBLIC_ITEM_SELECT,
    });

    await prisma.report.create({
      data: {
        itemId: createdItem.id,
        referenceNumber,
        policeReportNumber: parsed.policeReportNumber ?? null,
        isInstitutional: Boolean(parsed.institutionId),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        institutionId: parsed.institutionId ?? null,
        action: 'ITEM_REPORTED',
        entityType: 'Item',
        entityId: createdItem.id,
        details: {
          type: parsed.type,
          categorySlug: parsed.categorySlug,
          city: parsed.location.city,
          state: parsed.location.state,
          referenceNumber,
        },
      },
    });

    return toPublicItemDetail(
      {
        ...createdItem,
        reports: [{ referenceNumber }],
      },
      true
    );
  } catch (error: unknown) {
    if (error instanceof ItemForbiddenError) {
      throw error;
    }

    logger.error('Failed to create lost/found item', {
      userId: actor.id,
      institutionId: parsed.institutionId ?? null,
      error,
    });
    throw new ItemServiceError('Unable to save your item report right now.');
  }
}

export async function searchPublicItems(rawQuery: unknown): Promise<PaginatedItemsResponse> {
  const query = ItemSearchQuerySchema.parse(rawQuery);

  // Privacy invariant: NEVER search or filter on privateDetails
  const where: Prisma.ItemWhereInput = {
    deletedAt: null,
    isPublished: true,
  };

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (query.category) {
    where.category = {
      slug: query.category,
    };
  }

  if (query.state || query.city) {
    where.location = {
      ...(query.state ? { state: query.state } : {}),
      ...(query.city
        ? {
            city: {
              contains: query.city,
              mode: 'insensitive',
            },
          }
        : {}),
    };
  }

  if (query.dateFrom || query.dateTo) {
    where.dateLostOrFound = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  if (query.q && query.q.length > 0) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { publicDescription: { contains: query.q, mode: 'insensitive' } },
      { location: { city: { contains: query.q, mode: 'insensitive' } } },
      { location: { landmark: { contains: query.q, mode: 'insensitive' } } },
      {
        reports: {
          some: {
            referenceNumber: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
        },
      },
    ];
  }

  const orderBy: Prisma.ItemOrderByWithRelationInput = {
    [query.sort]: query.order,
  };

  const skip = (query.page - 1) * query.limit;

  try {
    const [rows, total] = await Promise.all([
      prisma.item.findMany({
        where,
        select: PUBLIC_ITEM_SELECT,
        orderBy,
        skip,
        take: query.limit,
      }),
      prisma.item.count({ where }),
    ]);

    return {
      items: rows.map(toPublicItemSummary),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  } catch (error: unknown) {
    logger.error('Failed to search public items', { error });
    throw new ItemServiceError('Unable to load items right now.');
  }
}

export async function getPublicItemById(
  rawId: string,
  viewer?: ItemActor | null
): Promise<PublicItemDetail> {
  const { id } = ItemIdParamSchema.parse({ id: rawId });

  try {
    const row = await prisma.item.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: PUBLIC_ITEM_SELECT,
    });

    if (!row) {
      throw new ItemNotFoundError();
    }

    const canManage = await canActorManageItem(row, viewer);
    if (!row.isPublished && !canManage) {
      throw new ItemNotFoundError();
    }

    return toPublicItemDetail(row, canManage);
  } catch (error: unknown) {
    if (error instanceof ItemNotFoundError) {
      throw error;
    }

    logger.error('Failed to fetch item by id', { itemId: id, error });
    throw new ItemServiceError('Unable to load item details right now.');
  }
}

export async function updateItem(
  rawId: string,
  actor: ItemActor,
  rawInput: unknown
): Promise<PublicItemDetail> {
  const { id } = ItemIdParamSchema.parse({ id: rawId });
  const parsed = UpdateItemInputSchema.parse(rawInput);

  try {
    const existing = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        reportedByUserId: true,
        institutionId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new ItemNotFoundError();
    }

    const allowed = await canActorManageItem(existing, actor);
    if (!allowed) {
      throw new ItemForbiddenError('You do not have permission to update this item.');
    }

    const updated = await prisma.item.update({
      where: { id: existing.id },
      data: {
        ...(parsed.title !== undefined ? { title: parsed.title } : {}),
        ...(parsed.publicDescription !== undefined
          ? { publicDescription: parsed.publicDescription }
          : {}),
        ...(parsed.privateDetails !== undefined ? { privateDetails: parsed.privateDetails } : {}),
        ...(parsed.contactPreference !== undefined
          ? { contactPreference: parsed.contactPreference }
          : {}),
        ...(parsed.isPublished !== undefined ? { isPublished: parsed.isPublished } : {}),
        ...(parsed.status !== undefined
          ? {
              status: parsed.status,
              recoveredAt: parsed.status === 'RECOVERED' ? new Date() : null,
            }
          : {}),
      },
      select: PUBLIC_ITEM_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        institutionId: existing.institutionId,
        action: 'ITEM_UPDATED',
        entityType: 'Item',
        entityId: existing.id,
        details: {
          updatedFields: Object.keys(parsed),
          ...(parsed.status ? { previousStatus: existing.status, newStatus: parsed.status } : {}),
        },
      },
    });

    return toPublicItemDetail(updated, true);
  } catch (error: unknown) {
    if (error instanceof ItemNotFoundError || error instanceof ItemForbiddenError) {
      throw error;
    }

    logger.error('Failed to update item', { itemId: id, userId: actor.id, error });
    throw new ItemServiceError('Unable to update item right now.');
  }
}

export async function softDeleteItem(rawId: string, actor: ItemActor): Promise<void> {
  const { id } = ItemIdParamSchema.parse({ id: rawId });

  try {
    const existing = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        reportedByUserId: true,
        institutionId: true,
      },
    });

    if (!existing) {
      throw new ItemNotFoundError();
    }

    const allowed = await canActorManageItem(existing, actor);
    if (!allowed) {
      throw new ItemForbiddenError('You do not have permission to delete this item.');
    }

    await prisma.item.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        isPublished: false,
        status: 'CLOSED',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        institutionId: existing.institutionId,
        action: 'ITEM_DELETED',
        entityType: 'Item',
        entityId: existing.id,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ItemNotFoundError || error instanceof ItemForbiddenError) {
      throw error;
    }

    logger.error('Failed to delete item', { itemId: id, userId: actor.id, error });
    throw new ItemServiceError('Unable to delete item right now.');
  }
}
