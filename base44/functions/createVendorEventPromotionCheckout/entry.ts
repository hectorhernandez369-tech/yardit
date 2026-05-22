import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.5.0';

/**
 * Creates a Stripe Checkout session for a vendor event promotion upgrade.
 * The event must already be saved as a draft with promotion_upgrade_required: true.
 * The upgrade is NOT applied here — it is applied only after the webhook confirms payment.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { vendor_event_id, vendor_account_id, additional_days, price_per_day } = body;

    if (!vendor_event_id || !vendor_account_id || !additional_days) {
      return Response.json({ error: 'Missing required fields: vendor_event_id, vendor_account_id, additional_days' }, { status: 400 });
    }

    // Verify the event exists and actually requires an upgrade (never trust the client)
    const base44Admin = base44.asServiceRole;
    const events = await base44Admin.entities.VendorEvent.filter({ id: vendor_event_id });
    const vendorEvent = events?.[0];

    if (!vendorEvent) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!vendorEvent.promotion_upgrade_required) {
      return Response.json({ error: 'This event does not require a promotion upgrade' }, { status: 400 });
    }

    if (vendorEvent.promotion_status === 'paid') {
      return Response.json({ error: 'Promotion upgrade already paid' }, { status: 400 });
    }

    if (vendorEvent.organizer_business_id !== vendor_account_id) {
      return Response.json({ error: 'Account mismatch' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-02-24.acacia',
    });

    // $5 per extra promotion day (adjust as needed — no Stripe Price ID required, use inline price)
    const unitAmountCents = Math.round((price_per_day || 500) * additional_days);
    if (unitAmountCents <= 0) {
      return Response.json({ error: 'Invalid price calculation' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const returnUrl = `${origin}/VendorEventDashboard?event_id=${vendor_event_id}&promo_checkout=return`;
    const cancelUrl = `${origin}/VendorEventDashboard?event_id=${vendor_event_id}&promo_checkout=cancel`;

    // Check if running in iframe — the frontend handles this, but we keep the session creation clean
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmountCents,
            product_data: {
              name: `Event Promotion Upgrade — +${additional_days} extra day${additional_days === 1 ? '' : 's'}`,
              description: `Coming Soon promotion upgrade for: ${vendorEvent.title || 'Vendor Event'}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: returnUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        purpose: 'vendor_event_promotion_upgrade',
        vendor_event_id,
        vendor_account_id,
        additional_days: String(additional_days),
        event_title: vendorEvent.title || '',
      },
    });

    // Store the pending checkout session ID on the event so the webhook can match it
    await base44Admin.entities.VendorEvent.update(vendor_event_id, {
      pending_upgrade_checkout_session_id: session.id,
      // Keep promotion_status as "upgrade_required" — NOT "paid". Webhook sets it to "paid".
    });

    console.log(`[createVendorEventPromotionCheckout] Created session ${session.id} for event ${vendor_event_id}, +${additional_days} days`);

    return Response.json({ checkout_url: session.url, session_id: session.id });
  } catch (error) {
    console.error('[createVendorEventPromotionCheckout] Error:', error?.message || error);
    return Response.json({ error: error.message || 'Checkout creation failed' }, { status: 500 });
  }
});