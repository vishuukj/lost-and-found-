# Database Documentation — Lost & Found India

## 1. Overview

The Lost & Found India platform uses MongoDB with Prisma ORM (`provider = "mongodb"`). MongoDB 24-character hex ObjectIds (`@id @default(auto()) @map("_id") @db.ObjectId`) are utilized across all 16 collections, with unique constraints and compound indexes synced via `prisma db push`.

---

## 2. Schema Architecture

```
User (1) ───< (N) Session
User (1) ───< (N) OAuthAccount
User (1) ───< (N) InstitutionMember >─── (1) Institution
User (1) ───< (N) Item [as reporter]
User (1) ───< (N) Claim [as claimant]
User (1) ───< (N) Notification
User (1) ───< (N) AuditLog

Institution (1) ───< (N) Item
Institution (1) ───< (N) AuditLog
Institution (1) ───< (N) ModerationCase

Item (1) ───< (N) ItemImage
Item (1) ───< (N) Report
Item (1) ───< (N) Claim
Item (1) ─── (N) Match (Lost & Found bidirectional)
Item (1) >─── (1) Category
Item (1) >─── (1) Location
Item (1) ───< (N) ModerationCase

Claim (1) ───< (N) ClaimEvidence
Claim (1) ─── (1) HandoverRecord
```

---

## 3. Entity Definitions & Purpose

1. **User**: Authentication identities, role-based access control (`USER`, `INSTITUTION_STAFF`, `INSTITUTION_ADMIN`, `PLATFORM_ADMIN`), and personal profile attributes. `passwordHash` is optional for OAuth-only accounts.
2. **OAuthAccount**: External OAuth identity links (`GOOGLE`, `FACEBOOK`) associated with a `User`, uniquely constrained by `(provider, providerAccountId)`.
3. **Session**: Secure bearer token sessions with IP and user agent tracking.
3. **Institution**: Registered campuses, transit hubs, airports, and public organizations managing localized lost & found facilities.
4. **InstitutionMember**: Association linking users to institutions with scoped roles (`ADMIN`, `STAFF`).
5. **Category**: Taxonomical categorization of belongings (Electronics, Documents, Wallets, etc.).
6. **Location**: Normalized geographic metadata (City, State, Indian PIN code, coordinates).
7. **Item**: The core listing record representing either a `LOST` or `FOUND` article. Includes distinct separation of `publicDescription` from `privateDetails`.
8. **ItemImage**: S3-backed asset URLs and keys associated with an item listing.
9. **Report**: Official reference tracking numbers, police station reports, or institutional logging codes.
10. **Match**: Bi-directional matching candidates calculated by the scoring engine linking lost and found items.
11. **Claim**: Adjudication requests submitted by potential owners attempting to recover a found item.
12. **ClaimEvidence**: Confidential documentation (receipts, serial numbers, matching photographs) submitted in support of a claim.
13. **HandoverRecord**: Verified legal confirmation of physical item return, recording identification check details and dual sign-offs.
14. **Notification**: In-app alert feeds for item matches, claim status updates, and institutional notices.
15. **AuditLog**: Immutable compliance trail capturing actor IDs, timestamps, actions, and altered states.
16. **ModerationCase**: Content moderation queue for suspicious items, false claims, or policy violations.

---

## 4. Privacy & Data Guardrails

- `Item.privateDetails` is NEVER selected in public feed queries or API responses.
- `ClaimEvidence` files and descriptions are accessible exclusively by the claimant and authenticated staff of the matching institution.
- Handover records store only `verifiedByIdType` and the last 4 digits (`verifiedByIdLast4`), complying with Indian data protection regulations.
