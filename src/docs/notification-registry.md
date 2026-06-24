# Yardit Notification Registry

This registry is the authoritative reference for Yardit notification development as of 2026-06-24. Every notification must define recipient, trigger, delivery method, type, title/message pattern, and deep link where applicable.

## Delivery Methods

- **Push**: Timely engagement or action. Used sparingly for nearby listings, listing-open reminders, saved listing activity, vendor check-ins, invitations, approvals, payment issues, and event updates.
- **Bell**: User activity history and confirmations. Bell items should not automatically interrupt the user.
- **Admin Inbox**: Routine administrator work. Reports, cases, admin notes, assisted listings, vendor administration, permission changes, billing logs, audit history, and system alerts belong here.
- **Email**: Reserved for future use. The architecture includes the delivery method but no new emails are sent yet.

## Active Registry

| Notification Type | Recipient | Trigger | Delivery Method | Current Status |
| --- | --- | --- | --- | --- |
| nearby_listings_daily_digest | Users with Listings Near Me enabled | Daily 5:00 AM summary of listings opening today inside the user's radius | Push | Active |
| listing_open | Listing owner | User-selected open time, not generic active-status transition | Push + Bell | Active |
| listing_status_change | Listing owner | Admin changes listing status | Bell | Active |
| listing_removed | Listing owner | Admin hides/removes/suspends listing | Push + Bell | Active |
| listing_flagged | Listing owner | Listing placed under review | Bell | Active |
| listing_expired | Listing owner | Listing reaches end time | Bell | Active |
| join_request | Neighborhood Sale organizer | Seller requests to join a Neighborhood Sale | Push + Bell | Active |
| join_request_accepted | Requesting seller | Organizer approves join request | Push + Bell | Active |
| join_request_denied | Requesting seller | Organizer denies join request | Push + Bell | Active |
| join_request_resolved | Neighborhood Sale organizer | Organizer completes approval/denial action | Bell | Active |
| co_host_invite | Requested co-host | Organizer requests use of verified address | Push + Bell | Active |
| neighborhood_sale_warning_48h | Organizer and approved participants | 48-hour checkpoint below minimum home count | Push + Bell | Active |
| neighborhood_sale_payment_succeeded | Organizer | Neighborhood Sale charge succeeds | Bell | Active |
| neighborhood_sale_payment_retry_scheduled | Organizer | Neighborhood Sale charge fails and retry is scheduled | Push + Bell | Active |
| neighborhood_sale_payment_failed_cancelled | Organizer | Primary and fallback charges fail | Push + Bell | Active |
| neighborhood_sale_fallback_applied | Organizer | Neighborhood Sale converts to Premium fallback | Bell | Active |
| vendor_account | Vendor owner / authorized user | Vendor account lifecycle update | Bell | Active |
| vendor_event | Vendor participant / organizer | Vendor event update | Push + Bell | Active |
| vendor_event_invite | Invited vendor | Organizer invites vendor to event | Push + Bell | Active |
| event_collaboration_invite | Invited organization | Event collaboration invitation | Push + Bell | Active |
| vendor_access_invite | Invited vendor staff user | Vendor owner invites user to vendor account | Push + Bell | Active |
| vendor_checkin | Users near a live vendor check-in | Vendor checks in at a public live location | Push | Active |
| vendor_subscription | Users subscribed to a vendor | Subscribed vendor checks in | Push | Active |
| report_received | Reporting user | User submits report | Bell | Active |
| admin_report | Admin Inbox | Report creates or updates an admin review item | Admin Inbox | Active |
| admin_case | Admin Inbox | Case assignment, escalation, submission, or review action | Admin Inbox | Active |
| admin_note | Admin Inbox | Internal note added to user/listing/case/vendor/payment record | Admin Inbox | Active |
| admin_vendor_account_auto_created | Admin Inbox | Master admin vendor account is auto-provisioned | Admin Inbox | Active |
| admin_billing | Admin Inbox | Routine billing log/payment audit event | Admin Inbox | Active |
| account_update | Affected user | Account/profile/employee ID/permission update | Bell | Active |

## Future / Reserved

| Notification Type | Recipient | Trigger | Delivery Method | Current Status |
| --- | --- | --- | --- | --- |
| saved_listing_active | User who saved/tracked listing | Saved listing reaches open time | Push + Bell | Future |
| payment_webhook_failure | Critical admins | Payment webhook failure or unrecoverable system payment issue | Push + Admin Inbox | Future |
| billing_cycles | Billing/admin history | Recurring billing cycle log or renewal event | Admin Inbox | Future |
| reserve_deposit | Vendor event participant / organizer | Vendor event reserve deposit workflow | Push + Bell | Future |
| account_created | Newly registered user after account exists | Successful account registration/onboarding completion | Bell | Future |

## Deprecated / Legacy Mapping

| Legacy Type | Replacement | Reason |
| --- | --- | --- |
| fallback_listing | neighborhood_sale_fallback_applied | Legacy fallback payment/listing bucket; not a user notification type. |
| vendor | vendor_account / vendor_event / vendor_checkin / vendor_subscription | Generic vendor bucket caused ambiguity. |
| nearby_listing | nearby_listings_daily_digest | Per-listing nearby pushes caused notification fatigue. |
| vendor_near_me | vendor_checkin | Legacy name for nearby vendor check-in pushes. |

## Architecture Rules

1. Push delivery is only allowed for registry types that explicitly include `push`.
2. Bell notifications are permanent user activity history and should not create push unless the registry says the same type is also push.
3. Routine administrator work goes to `AdminInboxItem`, not user bell notifications and not push.
4. Email is represented in the registry but no new outbound email workflows are enabled yet.
5. Existing notification history remains readable. Legacy records without `delivery_methods` continue to display as bell history.