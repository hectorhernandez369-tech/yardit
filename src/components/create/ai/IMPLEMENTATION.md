# AI1.h — Ask Yardit implementation update

This supersedes the earlier drafting-only implementation report.

## Implemented
- Existing independent AI listing route, two allowed accounts on client and server, saved conversations and private flyer uploads retained.
- Address search now restores confirmed fields, with explicit map confirmation and invalidation on changes.
- Mobile summary is collapsible; missing information and quick-answer choices are visible.
- Backend checks listing-type-specific facts, dates, ownership, and review.
- New completeAIListing server handler delegates self-posted Christmas, assisted Christmas QR, free yard sale, Pre-Spree, paid Featured/Premium, residential events and authorized assisted yard sales/events to existing trusted services.
- Regular paid listings use verified Stripe checkout; existing iOS website handoff reused. Final payment status is checked before publication is reported.
- Flyer uploads are retained privately during drafting. Authorized publication attaches flyer images or PDF links.
- Existing assisted promotion waivers are not extended to ordinary listings. AI-origin assisted approval and claiming require the matching homeowner account.
- Persisted result distinguishes published, scheduled, pending approval, and payment required, with approval-status refresh.
- Submission locks and reconciliation state protect against accidental repeated writes.

## Not completed or independently verified
- Neighborhood sale and Halloween specialized submission remain on the existing workflow. AI gathers facts but does not automatically submit these special types.
- No live account, Stripe checkout, QR approval, real device, or real flyer end-to-end tests have been performed; these require QA before asserting production reliability.
- In an uncertain submission, automatic repeat submission is blocked for safety; manual reconciliation may be required.
- No live payment or test public listing was created by code-level checks.

## Verification
- Production build and isolated access/validation/price tests.
- Existing Pre-Spree regression tests.
