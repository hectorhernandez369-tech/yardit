export const VENDOR_SETUP_STEPS = [
  {
    key: "business",
    label: "Business Info",
    description: "Add your public business details.",
    tab: "profile",
    targetId: "vendor-profile-editor",
  },
  {
    key: "pin",
    label: "Create First Vendor Pin",
    description: "Create your first truck or location profile.",
    tab: "pins",
    targetId: "vendor-trucks-section",
  },
  {
    key: "logo",
    label: "Upload Logo",
    description: "Add a business image or logo.",
    tab: "profile",
    targetId: "vendor-logo-upload",
  },
  {
    key: "tier",
    label: "Choose Tier",
    description: "Confirm Free or choose a paid plan.",
    tab: "tier",
    targetId: "vendor-tier-section",
  },
  {
    key: "dashboard",
    label: "Enter Vendor Dashboard",
    description: "Open your vendor dashboard.",
    tab: "profile",
    targetId: "vendor-dashboard-main",
  },
];

const hasValue = (value) => String(value || "").trim().length > 0;

export function getVendorSetupSteps(account, pins = []) {
  const businessComplete = Boolean(
    hasValue(account?.business_name) &&
    hasValue(account?.business_category) &&
    hasValue(account?.description) &&
    hasValue(account?.phone) &&
    hasValue(account?.business_street_address) &&
    hasValue(account?.business_city) &&
    hasValue(account?.business_state) &&
    hasValue(account?.business_zip_code)
  );

  const completed = {
    business: businessComplete,
    pin: (pins || []).some((pin) => pin.is_active !== false),
    logo: hasValue(account?.business_logo),
    tier: account?.vendor_tier_confirmed === true,
    dashboard: account?.vendor_dashboard_entered === true,
  };

  return VENDOR_SETUP_STEPS.map((step) => ({ ...step, complete: completed[step.key] }));
}

export function getVendorSetupProgress(account, pins = []) {
  const steps = getVendorSetupSteps(account, pins);
  const completedCount = steps.filter((step) => step.complete).length;
  const totalCount = steps.length;
  return {
    steps,
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    isComplete: completedCount === totalCount,
    nextIncompleteStep: steps.find((step) => !step.complete) || steps[steps.length - 1],
  };
}