const ADMIN_ROLES = new Set(['admin', 'master', 'supervisor', 'super_master']);

const DEMO_PAYMENT_STATUSES = new Set(['skipped_admin_demo', 'skipped_admin_promo']);
const DEMO_SETUP_STATUSES = new Set(['demo_skipped']);

function relId(value) {
  return value && typeof value === 'object' ? value.id : value;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export async function isGlobalDemoModeEnabled(base44) {
  const settings = await base44.asServiceRole.entities.AppSetting.filter({ key: 'app_mode' }).catch(() => []);
  return settings?.[0]?.value === 'demo';
}

export async function getDemoAuthorization(base44, user) {
  if (!user?.id) return { canUseDemoMode: false, appMode: 'live', isAuthorizedAdmin: false };

  const appMode = (await isGlobalDemoModeEnabled(base44)) ? 'demo' : 'live';

  const userEmail = normalizeEmail(user.email);
  const roleAdmin = ADMIN_ROLES.has(String(user.role || ''));
  const byUserId = await base44.asServiceRole.entities.AdminProfile.filter({ user_id: user.id }).catch(() => []);
  const byEmail = userEmail ? await base44.asServiceRole.entities.AdminProfile.filter({ email: userEmail }).catch(() => []) : [];
  const activeProfileAdmin = [...(byUserId || []), ...(byEmail || [])].some((profile) => {
    const profileUserId = relId(profile?.user_id);
    const profileEmail = normalizeEmail(profile?.email);
    return profile?.is_active === true && (profileUserId === user.id || (!!profileEmail && profileEmail === userEmail));
  });

  const isAuthorizedAdmin = roleAdmin || activeProfileAdmin;
  return { canUseDemoMode: appMode === 'demo' && isAuthorizedAdmin, appMode, isAuthorizedAdmin };
}

export function hasDemoBypassRequest(value = {}) {
  if (!value || typeof value !== 'object') return false;
  const action = String(value.action || '').toLowerCase();
  if (action.includes('demo') || action.includes('skip_checkout')) return true;
  if (value.is_demo_listing === true || value.is_demo_vendor === true) return true;
  if (value.demo_skip_amount_cents != null || value.demo_skip_session_id != null) return true;
  if (DEMO_PAYMENT_STATUSES.has(String(value.payment_status || ''))) return true;
  if (DEMO_SETUP_STATUSES.has(String(value.payment_setup_status || ''))) return true;
  const customerId = String(value.organizer_stripe_customer_id || value.stripe_customer_id || value.customer_id || '');
  const paymentMethodId = String(value.organizer_stripe_payment_method_id || value.stripe_payment_method_id || value.payment_method_id || '');
  return customerId.startsWith('demo_') || paymentMethodId.startsWith('demo_');
}

export function sanitizeDemoFields(data = {}) {
  const clean = { ...data, is_demo_listing: false };
  delete clean.demo_skip_amount_cents;
  delete clean.demo_skip_session_id;
  if (DEMO_PAYMENT_STATUSES.has(String(clean.payment_status || ''))) delete clean.payment_status;
  if (DEMO_SETUP_STATUSES.has(String(clean.payment_setup_status || ''))) delete clean.payment_setup_status;
  for (const key of ['organizer_stripe_customer_id', 'organizer_stripe_payment_method_id', 'organizer_setup_session_id', 'organizer_setup_intent_id', 'stripe_customer_id', 'stripe_payment_method_id']) {
    if (String(clean[key] || '').startsWith('demo_')) delete clean[key];
  }
  return clean;
}