import { describe, it, expect } from 'vitest';
import {
  ApiErrorResponseSchema,
  CreateItemInputSchema,
  EntityIdSchema,
  HealthCheckResponseSchema,
  ItemIdParamSchema,
  ItemSearchQuerySchema,
  LivenessCheckResponseSchema,
  LocationSchema,
  OAuthProfileInputSchema,
  OAuthProviderIdSchema,
  PaginationQuerySchema,
  UpdateItemInputSchema,
} from '../schemas';
import { INDIAN_STATES_AND_UTS } from '../constants';

describe('Shared Package Schemas & Constants', () => {
  it('validates a correct HealthCheckResponse', () => {
    const payload = {
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      environment: 'development',
      checks: {
        database: {
          status: 'connected',
          responseTimeMs: 12,
        },
        memory: {
          rssMb: 50,
          heapUsedMb: 25,
          heapTotalMb: 40,
        },
      },
    };

    const parsed = HealthCheckResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates a valid Indian location', () => {
    const validLocation = {
      address: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
      latitude: 28.6315,
      longitude: 77.2167,
    };

    const parsed = LocationSchema.safeParse(validLocation);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid Indian PIN code', () => {
    const invalidLocation = {
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '012345', // Starts with 0, invalid in India
    };

    const parsed = LocationSchema.safeParse(invalidLocation);
    expect(parsed.success).toBe(false);
  });

  it('includes all 36 Indian states and UTs in constants', () => {
    expect(INDIAN_STATES_AND_UTS.length).toBe(36);
    expect(INDIAN_STATES_AND_UTS).toContain('Delhi');
    expect(INDIAN_STATES_AND_UTS).toContain('Karnataka');
    expect(INDIAN_STATES_AND_UTS).toContain('Maharashtra');
  });

  it('validates supported OAuth providers (google and facebook)', () => {
    expect(OAuthProviderIdSchema.safeParse('google').success).toBe(true);
    expect(OAuthProviderIdSchema.safeParse('facebook').success).toBe(true);
    expect(OAuthProviderIdSchema.safeParse('github').success).toBe(false);
  });

  it('validates a valid OAuth profile payload', () => {
    const parsed = OAuthProfileInputSchema.safeParse({
      provider: 'google',
      providerAccountId: 'google-sub-12345',
      email: 'aarav.sharma@example.com',
      fullName: 'Aarav Sharma',
      avatarUrl: 'https://lh3.googleusercontent.com/a/example',
      emailVerified: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an OAuth profile payload with invalid email or empty providerAccountId', () => {
    const parsed = OAuthProfileInputSchema.safeParse({
      provider: 'facebook',
      providerAccountId: '',
      email: 'not-an-email',
      fullName: 'Priya Verma',
    });
    expect(parsed.success).toBe(false);
  });

  it('validates PaginationQuerySchema with dateLostOrFound sort field', () => {
    const parsed = PaginationQuerySchema.safeParse({
      page: '2',
      limit: '25',
      sort: 'dateLostOrFound',
      order: 'asc',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        page: 2,
        limit: 25,
        sort: 'dateLostOrFound',
        order: 'asc',
      });
    }
  });

  it('validates standardized ApiErrorResponseSchema and LivenessCheckResponseSchema', () => {
    expect(
      ApiErrorResponseSchema.safeParse({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again shortly.',
          requestId: 'req-123',
        },
      }).success
    ).toBe(true);

    expect(
      LivenessCheckResponseSchema.safeParse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 42,
      }).success
    ).toBe(true);
  });

  it('validates CreateItemInputSchema for a valid Lost item report', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const parsed = CreateItemInputSchema.safeParse({
      type: 'LOST',
      title: 'Black Dell XPS 13 Laptop in Grey Sleeve',
      categorySlug: 'electronics',
      dateLostOrFound: yesterday,
      publicDescription:
        'Left my Dell laptop in a grey padded sleeve near Platform 4 waiting bench at New Delhi Railway Station.',
      privateDetails: 'Has an IIT Delhi sticker on the bottom right corner and wallpaper of Ladakh.',
      contactPreference: 'IN_APP',
      location: {
        landmark: 'Platform 4 Waiting Area',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110002',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects CreateItemInputSchema with future date or invalid category', () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const parsed = CreateItemInputSchema.safeParse({
      type: 'FOUND',
      title: 'Found Leather Wallet',
      categorySlug: 'nonexistent_category',
      dateLostOrFound: nextWeek,
      publicDescription: 'Found a brown leather wallet near Rajiv Chowk metro exit gate 3.',
      location: {
        city: 'New Delhi',
        state: 'Delhi',
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('validates UpdateItemInputSchema and rejects empty payloads', () => {
    expect(UpdateItemInputSchema.safeParse({}).success).toBe(false);
    expect(UpdateItemInputSchema.safeParse({ status: 'RECOVERED' }).success).toBe(true);
  });

  it('validates ItemSearchQuerySchema and rejects inverted date ranges', () => {
    const valid = ItemSearchQuerySchema.safeParse({
      q: 'wallet',
      type: 'FOUND',
      category: 'wallets_bags',
      state: 'Karnataka',
      city: 'Bengaluru',
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
      page: '1',
      limit: '12',
    });
    expect(valid.success).toBe(true);

    const inverted = ItemSearchQuerySchema.safeParse({
      dateFrom: '2026-03-01',
      dateTo: '2026-02-01',
    });
    expect(inverted.success).toBe(false);
  });

  it('validates MongoDB 24-character hex ObjectIds via EntityIdSchema and ItemIdParamSchema', () => {
    expect(EntityIdSchema.safeParse('6740a1b2c3d4e5f60718293a').success).toBe(true);
    expect(ItemIdParamSchema.safeParse({ id: '6740a1b2c3d4e5f60718293a' }).success).toBe(true);
    expect(EntityIdSchema.safeParse('11111111-1111-4111-8111-111111111111').success).toBe(false);
    expect(EntityIdSchema.safeParse('not-an-object-id').success).toBe(false);
  });
});
