# Ask Yardit listing assistant restoration: drafting phase

## Delivered scope

This is a deliberately partial restoration, not an end-to-end posting implementation. The UI explicitly labels it a drafting preview. It supports a separate conversation, text-only input or a private image/PDF flyer, saved/resumable drafts, corrections, proposed fact summaries, explicit address/map confirmation, and saving a reviewed draft. It does not call any listing creation, payment, claiming or approval operation. A reviewed draft is never reported as a published listing.

The two allowed authenticated account emails are enforced on both restored/new backend functions through one shared guard, without administrator-role bypasses or user-ID alternatives. Backend reads scope drafts and conversation turns to the caller. Draft entity reads are owner- and email-restricted; app-user direct writes are reserved to workspace editors, while authorized server operations own the draft lifecycle. No User or AdminProfile records or permissions were changed.

## Existing implementation inspected/reused

- Recovered the deleted `draftAssistedEventAI` and `AIListingFlow` from repository history. Restored those names instead of creating a second listing assistant. Extended the previous extraction prompt into server-owned multi-turn facts and conversation history. Did not connect Help Center chat.
- Reused `AdminAddressSearch` and `AddressReviewMap` without editing either component.
- Reused Core InvokeLLM, UploadPrivateFile and CreateFileSignedUrl. Files are uploaded through the restricted backend, not a direct browser upload integration. Only the current caller's saved attachment is passed to the model; caller-supplied URLs are not accepted.
- Reused existing auth context, SDK, UI components, route/layout conventions and location-based tz-lookup.
- Inspected `createAssistedListing`, `manageAssistedChristmas`, `manageChristmasListing`, `saveResidentialListing`, checkout and existing tier/schedule helpers. These were left unchanged. In particular, createAssistedListing grants a promotional payment waiver and is not a general-purpose validation-and-payment submission API; blindly using it would not meet this request.
- Existing assisted QR components, tokens, approval/claim flows and matching-homeowner Christmas checks were not changed.

## Files changed

Existing files edited:
- src/App.jsx: explicit /CreateListingAI route and import.
- src/components/create/StepOne.jsx: isolated AI entry section.
- src/components/create/CreateListingEvent.jsx: same entry for event Step 1.

Restored files:
- base44/functions/draftAssistedEventAI/entry.ts
- src/components/create/AIListingFlow.jsx

New files:
- base44/entities/AIListingDraft.jsonc
- base44/entities/AIListingTurn.jsonc
- base44/shared/aiListingDrafts.ts
- base44/shared/aiListingFlyer.ts
- base44/functions/manageAIListingDraft/entry.ts
- src/pages/CreateListingAI.jsx
- src/components/create/ai/aiListingClient.js
- src/components/create/ai/useAIListingDraft.js
- src/components/create/ai/AIListingEntry.jsx
- src/components/create/ai/AIListingAttachment.jsx
- src/components/create/ai/AIListingConversation.jsx
- src/components/create/ai/AIListingDraftList.jsx
- src/components/create/ai/AIListingLocation.jsx
- src/components/create/ai/AIListingSummary.jsx
- src/components/create/ai/AIListingReview.jsx
- This implementation report.

## Checks actually performed

- Ran npm run build; the tool returned without a build error. Existing browser-database age warnings were emitted.
- manageAIListingDraft action=list returned HTTP 200 with an empty draft page under the current builder session.
- draftAssistedEventAI with an empty draft ID returned HTTP 404 before any AI request or write.
- These are development smoke checks only, not end-to-end QA. No actual listing, payment, approval QR or test draft was created by those checks.
- Reviewed authorization order in both endpoints, owner-scoped queries, server-side file validation (MIME, file signature, size), explicit location confirmation actions, revision-bound draft writes and per-draft AI request locking.

## Unverified checks and remaining implementation

Not implemented: dedicated trusted AI listing submission; all listing-type-specific final validation; authoritative tier/promotion pricing; payment continuation; final flyer mapping/publication; homeowner-permission submission; approval QR results; reliable creation idempotency/reconciliation; true published/scheduled/payment/approval result screens. The UI never claims these exist. Standard manual posting remains available without draft handoff or overwriting manual data.

Draft revision locks and request identifiers are present but simultaneous request/retry behavior needs end-to-end verification. They are not represented as listing-creation idempotency.

Both allowed accounts, a denied account, anonymous access, direct function requests, real image/PDF reading, corrections, weekday/date ambiguity, location invalidation, browser refresh/resume, mobile PDF previews and physical-device map behavior have not been exercised as those users. Use the Testing Agent (test-tube side panel) for app-flow QA; real account/device sessions are still required. Example goal: "Use text and a flyer to prepare an AI listing draft, correct its dates, confirm its map location, and resume it after refreshing; verify it does not publish anything." A separate access goal should attempt the same route and endpoints while signed out and as an account outside the allowlist.

Normal posting, Pre-Spree, Christmas choices, ratings, leaderboards, map clustering, vendor/league systems and assisted QR/claim security were left unchanged.
