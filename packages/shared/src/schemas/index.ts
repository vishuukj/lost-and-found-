import { z } from 'zod';
import { INDIAN_STATES_AND_UTS, ITEM_CATEGORIES } from '../constants';

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  environment: z.string(),
  checks: z.object({
    database: z.object({
      status: z.enum(['connected', 'disconnected', 'error']),
      responseTimeMs: z.number().optional(),
      message: z.string().optional(),
    }),
    memory: z.object({
      rssMb: z.number(),
      heapUsedMb: z.number(),
      heapTotalMb: z.number(),
    }),
  }),
});

export const LocationSchema = z.object({
  address: z.string().trim().min(3).max(255).optional(),
  landmark: z.string().trim().min(2).max(150).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.enum(INDIAN_STATES_AND_UTS as unknown as [string, ...string[]]),
  postalCode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Invalid Indian PIN code (must be 6 digits)')
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const LivenessCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
});

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1).max(100),
    message: z.string().min(1).max(500),
    requestId: z.string().min(1).max(128).optional(),
  }),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'dateLostOrFound']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const OAuthProviderIdSchema = z.enum(['google', 'facebook']);

export const OAuthProfileInputSchema = z.object({
  provider: OAuthProviderIdSchema,
  providerAccountId: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  fullName: z.string().trim().min(1).max(150),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
  emailVerified: z.boolean().optional().default(false),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.number().int().optional().nullable(),
  tokenType: z.string().max(50).optional().nullable(),
  scope: z.string().max(1000).optional().nullable(),
});

export type OAuthProfileInput = z.infer<typeof OAuthProfileInputSchema>;

const CATEGORY_SLUGS = ITEM_CATEGORIES.map((category) => category.id) as [string, ...string[]];

export const ItemTypeSchema = z.enum(['LOST', 'FOUND']);
export const ItemStatusSchema = z.enum(['OPEN', 'CLAIM_PENDING', 'RECOVERED', 'CLOSED', 'EXPIRED']);
export const ItemCategorySlugSchema = z.enum(CATEGORY_SLUGS);
export const ContactPreferenceSchema = z.enum(['IN_APP', 'EMAIL', 'INSTITUTION_DESK']);

export const EntityIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid MongoDB ObjectId');

export const ItemIdParamSchema = z.object({
  id: EntityIdSchema,
});

const MAX_FUTURE_DRIFT_MS = 24 * 60 * 60 * 1000;
const MAX_PAST_AGE_MS = 5 * 365 * 24 * 60 * 60 * 1000;

export const CreateItemInputSchema = z.object({
  type: ItemTypeSchema,
  title: z.string().trim().min(4, 'Title must be at least 4 characters').max(120),
  categorySlug: ItemCategorySlugSchema,
  dateLostOrFound: z.coerce
    .date()
    .refine(
      (date) => date.getTime() <= Date.now() + MAX_FUTURE_DRIFT_MS,
      'Date lost or found cannot be in the future'
    )
    .refine(
      (date) => date.getTime() >= Date.now() - MAX_PAST_AGE_MS,
      'Date lost or found cannot be older than 5 years'
    ),
  publicDescription: z
    .string()
    .trim()
    .min(15, 'Public description must be at least 15 characters')
    .max(1500),
  privateDetails: z
    .string()
    .trim()
    .min(5, 'Private verification clues must be at least 5 characters')
    .max(1000)
    .optional(),
  contactPreference: ContactPreferenceSchema.default('IN_APP'),
  institutionId: EntityIdSchema.optional().nullable(),
  policeReportNumber: z.string().trim().min(3).max(80).optional(),
  location: LocationSchema,
});

export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

export const UpdateItemInputSchema = z
  .object({
    title: z.string().trim().min(4).max(120).optional(),
    publicDescription: z.string().trim().min(15).max(1500).optional(),
    privateDetails: z.string().trim().min(5).max(1000).nullable().optional(),
    status: z.enum(['OPEN', 'RECOVERED', 'CLOSED']).optional(),
    contactPreference: ContactPreferenceSchema.optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

export const ItemSearchQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  type: ItemTypeSchema.optional(),
  status: ItemStatusSchema.optional(),
  category: ItemCategorySlugSchema.optional(),
  state: z.enum(INDIAN_STATES_AND_UTS as unknown as [string, ...string[]]).optional(),
  city: z.string().trim().max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  institutionId: EntityIdSchema.optional(),
}).refine(
  (query) => {
    if (query.dateFrom && query.dateTo) {
      return query.dateFrom.getTime() <= query.dateTo.getTime();
    }
    return true;
  },
  {
    message: 'dateFrom must be earlier than or equal to dateTo',
    path: ['dateFrom'],
  }
);

export type ItemSearchQuery = z.infer<typeof ItemSearchQuerySchema>;
