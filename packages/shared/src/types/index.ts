export type UserRole = 'USER' | 'INSTITUTION_STAFF' | 'INSTITUTION_ADMIN' | 'PLATFORM_ADMIN';

export type OAuthProviderId = 'google' | 'facebook';

export interface OAuthProviderStatus {
  id: OAuthProviderId;
  name: string;
  configured: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  provider?: OAuthProviderId;
}

export type ItemType = 'LOST' | 'FOUND';

export type ItemStatus = 'OPEN' | 'CLAIM_PENDING' | 'RECOVERED' | 'CLOSED' | 'EXPIRED';

export type ClaimStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFO_REQUESTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'HANDOVER_SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';

export type InstitutionStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED';

export type MatchStatus = 'POTENTIAL' | 'NOTIFIED' | 'CONFIRMED_MATCH' | 'DISMISSED';

export type NotificationType =
  | 'MATCH_FOUND'
  | 'CLAIM_STATUS_UPDATED'
  | 'REPORT_STATUS_UPDATED'
  | 'INSTITUTION_VERIFIED'
  | 'STAFF_INVITATION'
  | 'SECURITY_ALERT'
  | 'SYSTEM';

export interface LivenessCheckResponse {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  checks: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTimeMs?: number;
      message?: string;
    };
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
}

export type ContactPreference = 'IN_APP' | 'EMAIL' | 'INSTITUTION_DESK';

export interface PublicItemCategory {
  id: string;
  slug: string;
  name: string;
  iconName?: string | null;
}

export interface PublicItemLocation {
  city: string;
  state: string;
  landmark?: string | null;
  postalCode?: string | null;
}

export interface PublicItemInstitution {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string;
  state: string;
}

export interface PublicItemImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

/**
 * Strictly public projection of an Item.
 * NEVER includes privateDetails, reporter email, or reporter phone number.
 */
export interface PublicItemSummary {
  id: string;
  type: ItemType;
  status: ItemStatus;
  title: string;
  publicDescription: string;
  dateLostOrFound: string;
  createdAt: string;
  recoveredAt?: string | null;
  category: PublicItemCategory;
  location: PublicItemLocation;
  institution?: PublicItemInstitution | null;
  primaryImage?: PublicItemImage | null;
  referenceNumber?: string | null;
  hasPrivateVerificationClues: boolean;
}

export interface PublicItemDetail extends PublicItemSummary {
  contactPreference?: ContactPreference | null;
  images: PublicItemImage[];
  address?: string | null;
  reportedByDisplayName: string;
  canManage?: boolean;
}

export interface PaginatedItemsResponse {
  items: PublicItemSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
