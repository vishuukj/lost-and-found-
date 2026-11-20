# Security & Privacy Architecture — Lost & Found India

## 1. Security Philosophy

Lost & Found systems handle sensitive personal data, ownership claims, physical assets, and identification records. Security, privacy by design, and strict tenant boundaries are treated as first-class architectural constraints.

---

## 2. Threat Modeling & Countermeasures

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **False Item Ownership Claims** | Two-tier verification: Public listings hide private characteristics (`privateDetails`). Claimants must supply matching evidence (receipts, photos, serial fragments) scrutinized by verified staff. |
| **Cross-Tenant Data Exposure** | Multi-tenant boundaries enforced on all queries using `institutionId`. Zero reliance on client-side tenancy filtering. |
| **Credential & Session Hijacking** | Argon2/Bcrypt password hashing, secure HTTP-only cookies, session tokens with device/IP tracking, strict session revocation. |
| **Tampering with Handover Records** | Dual-party sign-off logged with verified ID type, masked identifier (last 4 digits only), and immutable audit logs. |
| **Brute Force & DoS Attacks** | Rate limiting at edge API gateways (e.g. 60 req/min for public routes, stricter on auth routes). |

---

## 3. Privacy-First Data Protection (DPDP Act Compliance)

In compliance with India's Digital Personal Data Protection (DPDP) Act:
1. **Purpose Limitation**: User data (contact details, claim evidence) is collected exclusively for item recovery.
2. **Data Minimization**: Government ID numbers (Aadhaar, PAN, DL) are never stored in full. Only the document type and last 4 digits are recorded for physical handover audit trails.
3. **No Public Identification**: Personal identifiers and private marks submitted during reporting are strictly withheld from public search indices.

---

## 4. Audit Logging & Compliance

All sensitive operations are captured in the `AuditLog` entity:
- User login / logout
- Claim submission, status updates, and adjudications
- Item modifications, cancellations, and status transitions
- Handover confirmations
- Institutional staff additions and permission changes
