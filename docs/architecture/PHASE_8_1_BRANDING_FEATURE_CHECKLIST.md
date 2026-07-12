# Phase 8.1 Branding and Feature Verification

Use disposable publishers after pending migrations are deployed outside production.

- [ ] Bluegate fallback name, colours, portal title, support details and AI name match the existing experience.
- [ ] Super Admin can inspect publishers and toggle only known feature definitions.
- [ ] Publisher Admin edits only its own safe branding fields and sees features read-only.
- [ ] Publisher B branding never changes Bluegate portals.
- [ ] Invalid colours, non-HTTP URLs, overlong values and invalid email are rejected.
- [ ] Publisher logo/favicon upload tokens accept only the authenticated publisher path and allowed formats/sizes.
- [ ] Legacy logo and upload URLs remain readable; a failed replacement does not erase the stored URL.
- [ ] AI Studio, Book Approvals, Resources and Notifications are enabled for Bluegate after backfill.
- [ ] Disabling a feature hides its navigation and blocks its direct server-rendered route.
- [ ] Relevant route handlers and Server Actions reject disabled features before mutation.
- [ ] Enabled but unimplemented catalog entries create no navigation or routes.
- [ ] Teacher sees the publisher AI name; School and Admin see publisher portal branding after authentication.
- [ ] Shared login pages retain Bluegate branding because domains and trusted pre-login tenant resolution are not implemented.
- [ ] Super Admin has no ordinary publisher context; School and Teacher cannot select or override publisher/theme/features.

Known Phase 8.1 acceptance boundary: upload replacement cleanup is performed only after a successful database update; private storage, domains, billing, plans, staff permissions, and public-site white labeling remain future work.
