import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'master' && user?.role !== 'super_master') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

    const secretKeyChecks = {
      exists: secretKey.length > 0,
      starts_with_sk_live: secretKey.startsWith('sk_live_'),
      has_no_leading_or_trailing_spaces: secretKey === secretKey.trim(),
      has_no_wrapping_quotes: !(secretKey.startsWith('"') || secretKey.endsWith('"') || secretKey.startsWith("'") || secretKey.endsWith("'")),
      appears_complete: secretKey.startsWith('sk_live_') && secretKey.length >= 80,
      length: secretKey.length,
      last4: secretKey.slice(-4)
    };

    const publishableKeyChecks = {
      exists: publishableKey.length > 0,
      starts_with_pk_live: publishableKey.startsWith('pk_live_'),
      has_no_leading_or_trailing_spaces: publishableKey === publishableKey.trim(),
      has_no_wrapping_quotes: !(publishableKey.startsWith('"') || publishableKey.endsWith('"') || publishableKey.startsWith("'") || publishableKey.endsWith("'")),
      length: publishableKey.length,
      last4: publishableKey.slice(-4)
    };

    const webhookSecretChecks = {
      exists: webhookSecret.length > 0,
      starts_with_whsec: webhookSecret.startsWith('whsec_'),
      has_no_leading_or_trailing_spaces: webhookSecret === webhookSecret.trim(),
      has_no_wrapping_quotes: !(webhookSecret.startsWith('"') || webhookSecret.endsWith('"') || webhookSecret.startsWith("'") || webhookSecret.endsWith("'")),
      length: webhookSecret.length,
      last4: webhookSecret.slice(-4)
    };

    let stripeAccount = null;
    let stripeApiValid = false;
    let stripeError = null;

    if (secretKeyChecks.exists) {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          Authorization: `Bearer ${secretKey}`
        }
      });

      const data = await response.json();
      stripeApiValid = response.ok;

      if (response.ok) {
        stripeAccount = {
          id: data.id,
          country: data.country,
          charges_enabled: data.charges_enabled,
          payouts_enabled: data.payouts_enabled,
          default_currency: data.default_currency,
          business_type: data.business_type,
          display_name: data.settings?.dashboard?.display_name || data.business_profile?.name || null
        };
      } else {
        stripeError = data.error?.message || 'Stripe rejected the stored secret key.';
      }
    }

    return Response.json({
      secretKeyChecks,
      publishableKeyChecks,
      webhookSecretChecks,
      stripeApiValid,
      stripeAccount,
      stripeError,
      note: 'Secret values are intentionally not returned; only safe metadata and checks are shown.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});