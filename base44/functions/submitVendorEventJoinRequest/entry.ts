import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const blockedInviteStatuses = new Set([
  "invited",
  "accepted",
  "pending_setup",
  "pending_payment",
  "approved",
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventId = body?.eventId;
    const vendorAccountId = body?.vendorAccountId;

    if (!eventId || !vendorAccountId) {
      return Response.json({ error: "Event and vendor account are required." }, { status: 400 });
    }

    const [events, accounts] = await Promise.all([
      base44.asServiceRole.entities.VendorEvent.filter({ id: eventId }),
      base44.asServiceRole.entities.VendorAccount.filter({ id: vendorAccountId }),
    ]);

    const event = events[0];
    const account = accounts[0];

    if (!event) return Response.json({ error: "Event not found." }, { status: 404 });
    if (!account) return Response.json({ error: "Vendor account not found." }, { status: 404 });

    const userEmail = String(user.email || "").toLowerCase();
    const ownsAccount = account.owner_user_id === user.id || String(account.owner_email || "").toLowerCase() === userEmail || account.user_id === user.id;

    if (!ownsAccount) {
      return Response.json({ error: "You do not have permission to use this vendor account." }, { status: 403 });
    }

    if (account.is_active === false) {
      return Response.json({ error: "This vendor account is inactive." }, { status: 400 });
    }

    if (event.open_to_vendors !== true) {
      return Response.json({ error: "This event is not accepting vendor requests." }, { status: 400 });
    }

    const [attendees, requests, invites] = await Promise.all([
      base44.asServiceRole.entities.EventVendorAttendee.filter({ event_id: eventId }),
      base44.asServiceRole.entities.EventVendorRequest.filter({ event_id: eventId, vendor_business_id: vendorAccountId }),
      base44.asServiceRole.entities.EventVendorInvite.filter({ event_id: eventId, vendor_business_id: vendorAccountId }),
    ]);

    const alreadyAttending = attendees.some((attendee) => attendee.vendor_business_id === vendorAccountId);

    if (alreadyAttending) {
      return Response.json({ error: "This vendor is already attending the event." }, { status: 409 });
    }

    const existingRequest = requests.find((request) => ["pending", "approved", "pending_payment"].includes(request.status));

    if (existingRequest) {
      return Response.json({ error: "This vendor already has an active request for the event." }, { status: 409 });
    }

    const blockingInvite = invites.find((invite) => blockedInviteStatuses.has(invite.status));

    if (blockingInvite) {
      return Response.json({ error: "This vendor already has an invitation or active event status." }, { status: 409 });
    }

    if (event.max_vendors) {
      const approvedCount = attendees.filter((attendee) => attendee.status !== "removed").length;
      if (approvedCount >= Number(event.max_vendors)) {
        return Response.json({ error: "This event has reached its vendor capacity." }, { status: 409 });
      }
    }

    const requestedSpaceOption = String(body?.requestedSpaceOption || "").trim();

    if (Array.isArray(event.vendor_space_options) && event.vendor_space_options.length > 0) {
      const validOption = event.vendor_space_options.some((option) => String(option?.label || "") === requestedSpaceOption);
      if (!validOption) {
        return Response.json({ error: "Select a valid vendor space." }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    const request = await base44.asServiceRole.entities.EventVendorRequest.create({
      event_id: eventId,
      vendor_user_id: user.id,
      vendor_business_id: vendorAccountId,
      business_name: account.business_name,
      logo: account.business_logo || "",
      request_message: String(body?.requestMessage || "").slice(0, 1000),
      requested_space_option: requestedSpaceOption,
      status: "pending",
      created_at: now,
      updated_at: now,
    });

    return Response.json({ success: true, request });
  } catch (error) {
    console.error("[submitVendorEventJoinRequest]", error);
    return Response.json({ error: error?.message || "The request could not be submitted." }, { status: 500 });
  }
});