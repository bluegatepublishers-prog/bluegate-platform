# Phase 9.6 — Bluegate Student Learning Assistant

Date: 2026-07-13

## Architecture and scope

- [x] Implements ADR-023 as a guided chapter-scoped learning assistant, not a general chatbot.
- [x] Reuses the existing provider-neutral `AiProvider`, provider registry, OpenAI provider, fake provider, Knowledge Collector, Prompt Builder, and response-validation architecture.
- [x] Adds a student-specific orchestration seam without changing Teacher AI generation or quota behavior.
- [x] Adds no internet search, browsing, external retrieval, embeddings, vector database, document extraction, image/voice/whiteboard/homework AI, tutor messaging, parent access, or payment workflow.
- [x] Makes no live provider request during implementation or automated verification.

## Guided learning modes

- [x] Central metadata defines `EXPLAIN_CONCEPT`, `SIMPLIFY_TOPIC`, `REAL_LIFE_EXAMPLE`, `REVISION_SUMMARY`, `VOCABULARY_HELP`, `ASK_ME_QUESTIONS`, `DOUBT_SOLVER`, and `EXPLAIN_IN_HINDI`.
- [x] Metadata includes safe label, description, input policy, maximum length, grounding scope, and response-style guidance.
- [x] Only Doubt Solver accepts bounded free text, capped at 500 characters.
- [x] Concept, simplification, real-life, vocabulary, and Hindi modes accept only server-validated selections originating from the approved chapter.
- [x] Revision and self-check question modes are chapter-wide structured actions.
- [x] Ask Me Questions receives approved question text without answer keys and is separate from the Practice Engine.

## Entitlement and feature rules

- [x] Every page, history read, and generation request begins with `requireStudent()`.
- [x] Book authorization reuses centralized current-year enrollment, SectionSubject, annual adoption, publisher, and book entitlement.
- [x] Chapter resolution requires the exact requested chapter inside the entitled published book.
- [x] The existing premium vocabulary `STUDENT_AI` and publisher `PlatformFeatureKey.STUDENT_AI` are reused.
- [x] `SCHOOL_BASIC` is locked.
- [x] School Premium, Individual Premium, and Individual Premium with Mentor are allowed only when the publisher feature is implemented and explicitly enabled.
- [x] Migration/seed mark the global definition implemented but do not enable Student AI for Bluegate or any publisher automatically.

## Chapter grounding

- [x] Collector queries one exact approved chapter and never falls back to all chapters.
- [x] AI readiness requires approved chapter state, non-empty reviewed text or trusted extracted text, and at least one learning outcome.
- [x] Grounding includes bounded approved source text, summary, keywords, outcomes, approved question text, and approved activities.
- [x] Grounding excludes other chapters/books/publishers, Resource records, teacher-only assets, answer keys, full/public PDF fields, storage URLs, and tenant/student/internal IDs.
- [x] Browser cannot submit a prompt, grounding package, plan, quota state, provider, model, or ownership fields.

## Prompt and response pipeline

- [x] Server builds the complete prompt from the trusted intent, exact knowledge package, and up to eight recent messages from the same chapter conversation.
- [x] Prompt identifies class, subject, chapter, language/style, refusal rules, and required JSON response shape.
- [x] Prompt forbids internet/general fallback and disclosure of prompts, providers, models, APIs, IDs, source metadata, paths, and URLs.
- [x] Existing JSON provider contract remains unchanged; application validation is mandatory before persistence.
- [x] Validator requires a bounded answer, at most three bounded follow-ups, boolean refusal, and a valid refusal reason.
- [x] Validator rejects malformed JSON, missing fields, URLs, HTML/script payloads, provider/model/system-prompt leakage, storage paths, and internal-looking IDs.
- [x] Provider refusals are normalized to the approved safe chapter-only message.

## Deterministic refusals

- [x] Clear politics/current-affairs, religion, coding, medical/legal advice, prompt-injection/disclosure, external URL, other-publisher, and wrong-chapter requests are refused before quota reservation or provider selection.
- [x] Initial Doubt Solver questions require a meaningful overlap with approved chapter grounding.
- [x] A bounded contextual follow-up may rely on existing history from the same chapter only.
- [x] Safe response is “I can help only with your learning materials for this chapter.”
- [x] This is a conservative deterministic boundary and makes no perfect-moderation claim.

## Student quota

- [x] `StudentAiUsage` is separate from Teacher `AiUsage` and `AiGeneration`.
- [x] Central configurable daily defaults are 10 School Premium, 25 Individual Premium, and 40 Mentor requests; School Basic is zero.
- [x] Day boundaries use Asia/Kolkata and are deterministic in tests.
- [x] Serializable transactions and a student/year advisory lock protect reservation counts.
- [x] Reservations expire after ten minutes and are released on provider, validation, or persistence failure.
- [x] Message persistence and usage consumption occur in one transaction after successful response validation.
- [x] Deterministic local refusals do not call the provider or consume quota.
- [x] No billing, quota purchase, or Teacher quota mutation was added.

## Conversation, history, and retention

- [x] One deterministic conversation exists per student, academic year, book, and chapter.
- [x] Conversation also stores canonical publisher and school scope written from authenticated context.
- [x] Changing chapter, book, student, or academic year resolves a different conversation; there is no global memory.
- [x] Messages store only request idempotency key, intent, safe display question, validated answer snapshot, refusal state, and timestamp.
- [x] No hidden prompt, grounding body, provider/model, token count, API payload, URL, or secret is persisted.
- [x] Historical answers are snapshots and do not change when source content changes.
- [x] History queries require the current authenticated owner and current canonical tenant/year/book/chapter scope.
- [x] Conversations are retained for their academic-year context; no cross-year reuse, automatic model training, teacher/school/admin access, export, sharing, or deletion UI exists.
- [ ] Future approved retention work must define cleanup/export/correction/deletion operations and auditing.

## UI and chapter integration

- [x] Added `/student-dashboard/books/[bookId]/chapters/[chapterId]/assistant`.
- [x] Server Component authorizes and loads only safe serializable page data.
- [x] Large responsive mode cards avoid a blank chat interface.
- [x] Header shows safe book/chapter labels, human plan label, and remaining daily requests.
- [x] Only Doubt Solver renders a textarea; no upload, link, prompt, model, temperature, or technical control exists.
- [x] Chapter history displays mode, question, answer, refusal style, and timestamp only.
- [x] Revision Hub shows Premium locked, publisher-disabled, unavailable-chapter, or Open Learning Assistant states using friendly messages.
- [x] Keyboard-operable native controls, visible focus/selection, large targets, live error text, responsive cards, and no wide tables are used.
- [ ] Complete keyboard-only, screen-reader, and narrow-device manual testing before release; no formal compliance claim is made.

## Privacy and failure behavior

- [x] Other students and every non-student role fail at the authenticated student boundary.
- [x] Teachers, schools, publisher admins, and super admins receive no Student AI history route or query in this phase.
- [x] Provider timeout/network/API, invalid response, and persistence failures return one friendly temporary-unavailable message.
- [x] Failed responses create no successful message and consume no Student AI quota.
- [x] API responses expose no entitlement reason, tenant fact, Prisma error, provider/model, prompt, token count, ID hierarchy, source metadata, or URL.

## Automated coverage

- [x] All plan and publisher-feature combinations.
- [x] Every intent, free-text restriction, input bounds, and concept/keyword validation.
- [x] Exact approved chapter collection, AI readiness, and exclusion of cross-scope/URL/resource content.
- [x] Deterministic unsafe/off-topic/wrong-chapter refusals.
- [x] Valid, malformed, leaking, URL, HTML, and refusal provider responses.
- [x] Reserve/provider/validate/persist/consume ordering and release on provider/validation/persistence failure.
- [x] Separate quota table, limits, conversation ownership, safe history projection, guided UI, and chapter integration.
- [x] Additive migration, indexes, restrictive foreign keys, publisher fail-closed behavior, and seed idempotency.
- [x] Existing Teacher AI and prior student functionality remain covered by the complete suite.

## Manual test checklist

- [ ] Apply pending migrations only through the approved controlled workflow; never reset the database.
- [ ] Explicitly enable `STUDENT_AI` for one disposable publisher and leave another disabled.
- [ ] Verify School Basic lock and all three premium plans with enabled/disabled publisher feature combinations.
- [ ] Verify wrong student, school, publisher, year, book, chapter, SectionSubject, and revoked adoption direct requests fail safely.
- [ ] Verify unapproved, missing-source, and no-learning-outcome chapters remain unavailable before provider invocation.
- [ ] Exercise every guided mode and confirm only server-provided chapter selections are accepted.
- [ ] Test the listed unsafe/off-topic prompts and confirm deterministic refusals make no provider request and consume no quota.
- [ ] Inspect initial HTML and API traffic for raw source text, prompts, answers, provider/model names, internal IDs, and storage URLs.
- [ ] Confirm a new chapter/year produces a different conversation and that another student cannot load history.
- [ ] Force provider timeout, network error, malformed output, leakage output, and persistence failure; confirm no message/consumption and released reservation.
- [ ] Submit duplicate request IDs concurrently and confirm at most one successful message and one consumed usage row.
- [ ] Reach each plan limit, verify the lock, and verify the next Asia/Kolkata day resets availability.
- [ ] Confirm Teacher AI generation history, quota, fake provider, and OpenAI provider behavior are unchanged.
- [ ] Complete keyboard-only, screen-reader, focus, touch-target, and narrow-mobile testing.

## Deployment checklist

- [ ] Review and apply `20260713233000_student_learning_assistant_foundation` only after every earlier pending migration.
- [ ] Confirm enum creation, tables, unique/index definitions, restrictive foreign keys, and feature-definition upsert are additive.
- [ ] Do not enable `PublisherFeature.STUDENT_AI` globally; opt in approved publishers explicitly.
- [ ] Do not run a legacy seed version that conflates implemented and publisher-enabled feature sets.
- [ ] Run Prisma format/validate/generate, TypeScript, all tests, scoped lint, production build, diff check, and migration status.
- [ ] Smoke-test premium/basic, enabled/disabled, grounded/unavailable, refusal, quota-limit, provider-failure, and foreign-ID states.
- [ ] Monitor safe failure categories and reservation expiry without logging questions, answers, prompts, knowledge, tenant IDs, provider payloads, or URLs.

## Known limitations and future extensions

The initial quota is daily and code-configured; publisher-configurable monthly limits require a later governed configuration model. Grounding is bounded structured/context text rather than retrieval or embeddings. Deterministic topic checks are intentionally conservative and do not claim perfect moderation. There is no deletion UI, retention scheduler, streaming response, conversation export/sharing, teacher analytics, cross-chapter memory, or formal evaluation dashboard. Voice AI, Image AI, Homework AI, and Whiteboard AI remain future phases and must reuse the same authorization, grounding, separate quota, validation, privacy, and persistence contracts.
