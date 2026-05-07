# Security Specification - SafeQMS

## Data Invariants
1. A user must belong to a company to access any operational data (processes, risks, etc.).
2. Only Admins or Superadmins can modify company-wide settings or view audit logs.
3. Documents and attachments are scoped to the company.
4. Users cannot change their own role unless they are a Superadmin.
5. All IDs must follow standard string constraints.

## The Dirty Dozen Payloads (Attack Vectors)

1. **Identity Spoofing**: Attempt to create a process with another user's `created_by` ID.
2. **Privilege Escalation**: A regular user attempts to update their own `role` to 'superadmin'.
3. **Cross-Tenant Access**: User A from Company 1 attempts to read `processes` from Company 2.
4. **Orphaned Write**: Attempt to create a `task` without a `company_id`.
5. ** shadow Field Injection**: Attempt to `update` a process with a hidden field `__is_verified: true`.
6. **Large Payload DoS**: Attempt to write a status field that is 1MB in size.
7. **Invalid ID Injection**: Use a document ID containing special characters like `../secret`.
8. **PII Leak**: An unauthenticated user attempts to `get` a user profile email.
9. **Role Bypass**: An `admin` attempts to delete a `superadmin` profile.
10. **Terminal State Skip**: Attempt to move a deviation from 'open' to 'closed' without filling required follow-up fields.
11. **Timestamp Spoofing**: Provide a client-side `created_at` timestamp in the past.
12. **Audit Bypass**: Perform a write operation without generating a corresponding audit log (enforced via app logic, but rules should restrict certain fields).

## Test Runner Logic
The `firestore.rules.test.ts` will verify that these payloads result in `PERMISSION_DENIED`.
