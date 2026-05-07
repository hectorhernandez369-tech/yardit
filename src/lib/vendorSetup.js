export const VENDOR_SETUP_STEPS = [
  {
    key: "business_info",
    title: "Business Info",
    description: "Complete your public business profile details.",
    dashboardTab: "profile",
  },
  {
    key: "first_pin",
    title: "Create First Vendor Pin",
    description: "Create your first truck or location profile.",
    dashboardTab: "pins",
  },
  {
    key: "logo",
    title: "Upload Logo",
    description: "Add a business logo or profile image.",
    dashboardTab: "profile",
  },
  {
    key: "tier",
    title: "Choose Tier",
    description: "Confirm Free or choose a paid tier.",
    dashboardTab: "tier",
  },
  {
    key: "dashboard",
    title: "Enter Vendor Dashboard",
    description: "Open your dashboard and continue managing your vendor account.",
    dashboardTab: "profile",
  },
];

const hasValue = (value) => String(value || "").trim().length > 0;

export function getVendorSetupProgress(account, pins = []) {
  const businessAddressComplete = hasValue(account?.business_address) || (
    hasValue(account?.business_street_address) &&
    hasValue(account?.business_city) &&
    hasValue(account?.business_state) &&
    hasValue(account?.business_zip_code)
  );

  const completed = {
    business_info: hasValue(account?.business_name) && hasValue(account?.business_category) && hasValue(account?.description) && hasValue(account?.phone) && businessAddressComplete,
    first_pin: (pins || []).some((pin) => pin.is_active !== false),
    logo: hasValue(account?.business_logo),
    tier: account?.setup_tier_confirmed === true,
    dashboard: account?.setup_dashboard_entered === true,
  };

  const completedCount = VENDOR_SETUP_STEPS.filter((step) => completed[step.key]).length;
  const total = VENDOR_SETUP_STEPS.length;

  return {
    completed,
    completedCount,
    total,
    percent: Math.round((completedCount / total) * 100),
    isComplete: completedCount === total,
    remainingSteps: VENDOR_SETUP_STEPS.filter((step) => !completed[step.key]),
  };
}

export function getFirstIncompleteSetupIndex(account, pins = []) {
  const progress = getVendorSetupProgress(account, pins);
  const index = VENDOR_SETUP_STEPS.findIndex((step) => !progress.completed[step.key]);
  return index === -1 ? VENDOR_SETUP_STEPS.length - 1 : index;
}

export function getVendorSetupStepUrl(stepKey) {
  const step = VENDOR_SETUP_STEPS.find((item) => item.key === stepKey) || VENDOR_SETUP_STEPS[0];
  return `/VendorSetup?step=${step.key}`;
}

export function getVendorSetupDashboardStepUrl(stepKey) {
  const step = VENDOR_SETUP_STEPS.find((item) => item.key === stepKey) || VENDOR_SETUP_STEPS[0];
  return `/VendorDashboard?tab=${step.dashboardTab}&setup=${step.key}`;
}