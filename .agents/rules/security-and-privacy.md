# Security & Privacy Rules

1. **Confidentiality of Clues & Evidence**:
   - Clues (`privateDetails`) such as IMEI numbers, wallpapers, personal engravings, or bag contents must NEVER be serialized into public item response payloads.
   - Claim evidence (`ClaimEvidence`) is accessible ONLY to the claimant and the verified staff/admin of the hosting institution.
2. **Server-Side Authorization**:
   - Never trust role headers, cookies, or client claim parameters without verifying session authenticity in route handlers.
   - Institutional operations MUST verify `institutionId` membership before querying or mutating data.
3. **Safe Error Handling**:
   - Database connection errors, stack traces, and internal query details must never be forwarded to client responses. Return standardized user-safe error messages.
